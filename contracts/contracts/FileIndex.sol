pragma solidity ^0.4.4;

contract FileIndex {

  struct FileEntry {
    string filename;
    mapping (bytes32 => bool) isAccessible;
    bool existed;
  }

  bytes32[] allUsers;
  bytes32[] allHashes;
  mapping (bytes32 => bytes32[]) userHashes;
  mapping (bytes32 => bytes32) hashUser;
  mapping (bytes32 => FileEntry) files;

  mapping (bytes32 => bytes32) private passwords;

  function FileIndex() public {
    // constructor
  }

  function login(string id, string password) public view returns (bool) {
    bytes32 key = keccak256(id);
    return (passwords[key] != 0 && keccak256(password) == passwords[key]);
  }

  function register(string id, string password) public returns (bool) {
    bytes32 key = keccak256(id);
    if (passwords[key] == 0) {
      passwords[key] = keccak256(password);
      allUsers.push(key);
      return true;
    } else {
      return false;
    }
  }

  function storeHash(string id, bytes32 hash, string filename) public {
    bytes32 key = keccak256(id);

    FileEntry storage entry = files[hash];
    entry.filename = filename;

    // add to hash array only if there is no existing file entry
    if (!entry.existed) {
      userHashes[key].push(hash);
      hashUser[hash] = key;
      allHashes.push(hash);
      entry.existed = true;
    }
  }  

  function getHashes(string id, bool all) public view returns (bytes32[]) {
    bytes32 key = keccak256(id);
    if (all) {
      return allHashes;
    } else {
      return userHashes[key];
    }
  }  

  function getFilename(bytes32 hash) public view returns (string) {
    return files[hash].filename;
  }  

  function allowAccess(string id, bytes32 hash, bytes32 recipient) public {
    bytes32 key = keccak256(id);
    if (hashUser[hash] == key) {
      FileEntry storage entry = files[hash];
      entry.isAccessible[recipient] = true;
    }
  }  

  function denyAccess(string id, bytes32 hash, bytes32 recipient) public {
    bytes32 key = keccak256(id);
    if (hashUser[hash] == key) {
      FileEntry storage entry = files[hash];
      entry.isAccessible[recipient] = false;
    }
  }  

  function isAccessible(string id, bytes32 hash, bytes32 recipient) public view returns(bool) {
    bytes32 key = keccak256(id);
    if (hashUser[hash] == key) {
      FileEntry storage entry = files[hash];
      return entry.isAccessible[recipient];
    }
  }  
}
