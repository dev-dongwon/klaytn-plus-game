const fs = require('fs');
const AdditionGame = artifacts.require('./AdditionGame.sol')

module.exports = async function (deployer) {
  deployer.deploy(AdditionGame);
}