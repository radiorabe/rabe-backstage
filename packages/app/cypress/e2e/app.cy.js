describe('App', () => {
  it('should render the login page', () => {
    cy.visit('/');
    cy.contains('RaBe Backstage');
    cy.contains('Sign in using')
  });
});
