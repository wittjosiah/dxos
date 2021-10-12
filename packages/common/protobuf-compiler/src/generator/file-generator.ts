//
// Copyright 2021 DXOS.org
//

import { dirname, join } from 'path';
import pb from 'protobufjs';
import * as ts from 'typescript';

import { CODEC_MODULE, ModuleSpecifier } from '../module-specifier';
import { getSafeNamespaceIdentifier, parseFullyQualifiedName } from '../namespaces';
import { SubstitutionsMap } from '../parser';
import { createDeclarations, createTypeDictionary } from './declaration-generator';
import { createSerializerDefinition } from './serializer-definition-generator';
import { createServicesDictionary } from './service';

const f = ts.factory;

function createSubstitutionsImport (substitutionsModule: ModuleSpecifier, context: string) {
  return substitutionsModule && ts.factory.createImportDeclaration(
    [],
    [],
    ts.factory.createImportClause(false, ts.factory.createIdentifier('substitutions'), undefined),
    ts.factory.createStringLiteral(substitutionsModule.importSpecifier(context))
  );
}

export function createNamespaceSourceFile (
  types: pb.ReflectionObject[],
  substitutions: SubstitutionsMap,
  outDir: string,
  namespace: string,
  substitutionsModule: ModuleSpecifier | undefined,
  otherNamespaces: string[]
) {
  const outFile = join(outDir, getFileNameForNamespace(namespace));
  const declarations: ts.Statement[] = Array.from(createDeclarations(types, substitutions));

  const substitutionsImport = substitutionsModule && createSubstitutionsImport(substitutionsModule, dirname(outFile));

  const otherNamespaceImports = createNamespaceImports(otherNamespaces.filter(ns => ns !== namespace), outDir, dirname(outFile));

  return ts.factory.createSourceFile(
    [
      createStreamImport(),
      ...(substitutionsImport ? [substitutionsImport] : []),
      ...otherNamespaceImports,
      ...declarations
    ],
    ts.factory.createToken(ts.SyntaxKind.EndOfFileToken),
    ts.NodeFlags.None
  );
}

export function createIndexSourceFile (substitutionsModule: ModuleSpecifier | undefined, root: pb.Root, outDirPath: string, namespaces: string[]) {
  const {
    imports: schemaImports,
    exports: schemaExports
  } = createSerializerDefinition(substitutionsModule, root, outDirPath);

  const substitutionsImport = substitutionsModule && createSubstitutionsImport(substitutionsModule, outDirPath);
  const otherNamespaceImports = createNamespaceImports(namespaces, outDirPath, outDirPath);

  return ts.factory.createSourceFile(
    [
      ...schemaImports,
      ...otherNamespaceImports,
      ...(substitutionsImport ? [substitutionsImport] : []),
      createTypeDictionary(root),
      createServicesDictionary(root),
      ...schemaExports
    ],
    ts.factory.createToken(ts.SyntaxKind.EndOfFileToken),
    ts.NodeFlags.None
  );
}

function createNamespaceImports (namespaces: string[], outDirPath: string, context: string) {
  return namespaces
    .sort((b, a) => b.localeCompare(a))
    .map(ns => f.createImportDeclaration(
      [],
      [],
      f.createImportClause(false, undefined, f.createNamespaceImport(f.createIdentifier(getSafeNamespaceIdentifier(parseFullyQualifiedName(ns))))),
      f.createStringLiteral(ModuleSpecifier.resolveFromFilePath(getFileNameForNamespace(ns), outDirPath).importSpecifier(context))
    ));
}

export function getFileNameForNamespace (namespace: string) {
  const name = parseFullyQualifiedName(namespace);
  return `${name.join('/')}.ts`;
}

function createStreamImport () {
  return f.createImportDeclaration(
    [],
    [],
    f.createImportClause(false, undefined, f.createNamedImports([
      f.createImportSpecifier(undefined, f.createIdentifier('Stream'))
    ])),
    f.createStringLiteral(CODEC_MODULE.importSpecifier(''))
  );
}