export const packageName = (fullName: string) => {
  const [ scope, name ] = fullName.split('/');
  return {
    scope: name ? scope : null,
    name: name ?? scope
  };
}