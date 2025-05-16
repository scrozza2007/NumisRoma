describe('Delete Account', () => {
  beforeEach(() => {
    // Mock user login
    cy.intercept('POST', '/api/auth/login', {
      statusCode: 200,
      body: {
        token: 'test-token',
        user: {
          _id: 'test-user-id',
          username: 'testuser',
          email: 'test@example.com'
        }
      }
    }).as('loginUser');

    // Visit login page and log in
    cy.visit('/login');
    cy.get('input[id="identifier"]').type('testuser');
    cy.get('input[id="password"]').type('TestPassword123!');
    cy.get('button[type="submit"]').click();
    cy.wait('@loginUser');
    
    // Go to settings page
    cy.visit('/settings');
  });

  it('should display the delete account button in privacy tab', () => {
    // Click on privacy tab
    cy.contains('Privacy & Security').click();
    
    // Verify delete account button exists
    cy.contains('Delete Account').should('exist');
  });

  it('should open delete account modal when clicking the delete button', () => {
    // Click on privacy tab
    cy.contains('Privacy & Security').click();
    
    // Click on delete account button
    cy.contains('Delete Account').click();
    
    // Verify modal opens
    cy.contains('This action cannot be undone').should('be.visible');
    cy.get('input[id="delete-confirm-password"]').should('be.visible');
  });

  it('should close the modal when clicking cancel', () => {
    // Click on privacy tab
    cy.contains('Privacy & Security').click();
    
    // Click on delete account button
    cy.contains('Delete Account').click();
    
    // Click cancel
    cy.contains('Cancel').click();
    
    // Verify modal closes
    cy.contains('This action cannot be undone').should('not.exist');
  });

  it('should display error message when password is incorrect', () => {
    // Mock failed delete account request
    cy.intercept('POST', '/api/auth/delete-account', {
      statusCode: 400,
      body: {
        error: 'Password is incorrect',
        field: 'password'
      }
    }).as('deleteAccountFailed');

    // Click on privacy tab
    cy.contains('Privacy & Security').click();
    
    // Click on delete account button
    cy.contains('Delete Account').click();
    
    // Enter wrong password and submit
    cy.get('input[id="delete-confirm-password"]').type('wrongpassword');
    cy.contains('Delete My Account').click();
    cy.wait('@deleteAccountFailed');
    
    // Verify error message
    cy.contains('Password is incorrect').should('be.visible');
  });

  it('should delete account and redirect to goodbye page when password is correct', () => {
    // Mock successful delete account request
    cy.intercept('POST', '/api/auth/delete-account', {
      statusCode: 200,
      body: {
        message: 'Account deleted successfully'
      }
    }).as('deleteAccountSuccess');

    // Click on privacy tab
    cy.contains('Privacy & Security').click();
    
    // Click on delete account button
    cy.contains('Delete Account').click();
    
    // Enter correct password and submit
    cy.get('input[id="delete-confirm-password"]').type('TestPassword123!');
    cy.contains('Delete My Account').click();
    cy.wait('@deleteAccountSuccess');
    
    // Verify redirect to registration page
    cy.url().should('eq', Cypress.config().baseUrl + '/register');
    cy.contains('Create your account').should('be.visible');
  });
});