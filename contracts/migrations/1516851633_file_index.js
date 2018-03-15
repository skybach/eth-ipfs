var FileIndex = artifacts.require("./FileIndex.sol");

module.exports = function(deployer) {
  // Use deployer to state migration tasks.
  deployer.deploy(FileIndex);
};
