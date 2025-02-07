//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';

import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { Credential, SpaceMember } from '@dxos/protocols/proto/dxos/halo/credentials';
import { AsyncCallback, Callback, ComplexMap } from '@dxos/util';

import { getCredentialAssertion } from '../credentials';

export interface MemberInfo {
  key: PublicKey;
  credential: Credential;
  assertion: SpaceMember;
}

/**
 * Tracks the list of members (with roles) for the space.
 * Provides a list of admitted feeds.
 */
export class MemberStateMachine {
  /**
   * Member IDENTITY key => info
   */
  private _members = new ComplexMap<PublicKey, MemberInfo>(PublicKey.hash);

  readonly onMemberAdmitted = new Callback<AsyncCallback<MemberInfo>>();

  // prettier-ignore
  constructor(
    private readonly _spaceKey: PublicKey
  ) {}

  get members(): ReadonlyMap<PublicKey, MemberInfo> {
    return this._members;
  }

  getRole(member: PublicKey): SpaceMember.Role | undefined {
    return this._members.get(member)?.assertion.role;
  }

  /**
   * Processes the SpaceMember credential.
   * Assumes the credential is already pre-verified
   * and the issuer has been authorized to issue credentials of this type.
   * @param fromFeed Key of the feed where this credential is recorded.
   */
  async process(credential: Credential) {
    const assertion = getCredentialAssertion(credential);
    assert(assertion['@type'] === 'dxos.halo.credentials.SpaceMember');
    assert(assertion.spaceKey.equals(this._spaceKey));
    assert(!this._members.has(credential.subject.id));

    const info: MemberInfo = {
      key: credential.subject.id,
      credential,
      assertion
    };
    this._members.set(credential.subject.id, info);
    log('member added', {
      member: credential.subject.id,
      space: this._spaceKey,
      role: assertion.role,
      profile: assertion.profile
    });
    await this.onMemberAdmitted.callIfSet(info);
  }
}
