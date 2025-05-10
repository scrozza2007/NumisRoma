describe('Login utente', () => {
    it('Esegue il login con credenziali valide', () => {
      cy.visit('http://localhost:3000/login');
  
      cy.get('input[type="email"]').type('samuele@example.com');
      cy.get('input[type="password"]').type('password123');
      cy.get('button[type="submit"]').click();
  
      cy.url().should('eq', 'http://localhost:3000/');
    });
  });  