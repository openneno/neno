/// <reference types="Cypress" />

describe("The count button", function() {
  it("successfully increments", function() {
    cy.visit("/");
    cy.get(".button")
      .click()
      .contains("Count is 1");
  });
});
