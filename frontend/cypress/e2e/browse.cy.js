describe("Browse Coins", () => {
  beforeEach(() => {
    cy.visit("/browse");
  });

  it("loads the browse page", () => {
    cy.contains("Roman Republican and Imperial").should("exist");
  });

  it("displays a list of coins", () => {
    cy.get("a[href*='/coin-detail']", { timeout: 10000 }).should(
      "have.length.greaterThan",
      0
    );
  });

  it("filters coins by search term", () => {
    cy.get('input[placeholder="Search all fields…"]').type("Augustus");
    cy.wait(500);
    cy.get("a[href*='/coin-detail']", { timeout: 10000 }).should("exist");
  });

  it("navigates to a coin detail page from browse", () => {
    cy.get("a[href*='/coin-detail']", { timeout: 10000 })
      .first()
      .click();
    cy.url().should("include", "/coin-detail");
  });
});
