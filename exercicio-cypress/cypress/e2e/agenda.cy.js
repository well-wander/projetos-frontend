/// <reference types="cypress" />

describe('Testes para a agenda de contatos', () => {
  beforeEach(() => {
    cy.visit('/')
  })

  it('Deve incluir um contato', () => {
    cy.get('.contato').then((contatos) => {
      cy.get('[type="text"]').type('Maria Teste')
      cy.get('[type="email"]').type('maria@teste.com')
      cy.get('[type="tel"]').type('11900000000')
      cy.get('.adicionar').click()

      cy.get('.contato').should('have.length', contatos.length + 1)
      cy.contains('.contato', 'Maria Teste').should('contain', 'maria@teste.com')
    })
  })

  it('Deve alterar um contato', () => {
    cy.get('.edit').first().click()
    cy.get('[type="text"]').clear().type('Nome Alterado')
    cy.get('.alterar').click()

    cy.get('.contato').first().should('contain', 'Nome Alterado')
  })

  it('Deve remover um contato', () => {
    cy.get('.contato').then((contatos) => {
      const removido = contatos.first().find('li').first().text()

      cy.get('.delete').first().click()

      cy.get('.contato').should('have.length', contatos.length - 1)
      cy.contains('.contato', removido).should('not.exist')
    })
  })
})
