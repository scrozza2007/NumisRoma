describe('Homepage', () => {
  beforeEach(() => {
    // Set up any mocks or intercepts here
    cy.intercept('GET', '/api/coins*', { fixture: 'coins.json' }).as('getCoins');
    
    // Visit the homepage
    cy.visit('/');
  });

  it('should display the catalog title', () => {
    cy.contains('h1', 'Catalogo Monete Antiche Romane').should('be.visible');
  });

  it('should have a working search bar', () => {
    cy.get('input[placeholder*="Cerca monete"]').should('be.visible');
    cy.get('button').contains('Cerca').should('be.visible');
  });

  it('should have advanced filters', () => {
    cy.contains('button', 'Filtri Avanzati').should('be.visible');
    cy.contains('button', 'Filtri Avanzati').click();
    
    cy.get('form').within(() => {
      cy.get('input#emperor').should('be.visible');
      cy.get('input#date_range').should('be.visible');
      cy.get('select#material').should('be.visible');
    });
  });

  it('should navigate to the login page', () => {
    cy.get('a').contains('Accedi').click();
    cy.url().should('include', '/login');
  });
}); 