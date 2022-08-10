// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2021 PrimeDao

pragma solidity ^0.8.6;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Badger is ERC1155, Ownable {
    /*
        State Variables
    */

    mapping(uint256 => string) public tokenUris;

    /*
        Errors
    */

    error TransferDisabled();

    /*
        Modifiers
    */

    modifier isSameLength(
        address[] calldata accounts,
        uint256[] calldata tokenIds,
        uint256[] memory amounts
    ) {
        require(
            accounts.length == tokenIds.length &&
                tokenIds.length == amounts.length,
            "Input array mismatch"
        );
        _;
    }

    /*
        Constructor
    */

    constructor(string memory _baseUri) ERC1155(_baseUri) {}

    /*
        Configuration
    */

    /**
     * @dev                 sets a uri for a token to be appended to baseUri
     * @param tokenId       id of token (category)
     * @param newUri        uri to be appended
     */
    function setUri(uint256 tokenId, string memory newUri) external onlyOwner {
        tokenUris[tokenId] = newUri;
    }

    /**
     * @dev                 sets a base uri for all token ids
     * @param baseUri       base uri (is appended by tokenUri)
     */
    function setBaseUri(string memory baseUri) external onlyOwner {
        _setURI(baseUri);
    }

    /*
        Minting & burning
    */

    /**
     * @dev                 mints specified amount token(s) of specific id to specified account
     * @param account       beneficiary address
     * @param id            id of token, aka. tier
     * @param amount        units of token to be minted to beneficiary
     */
    function mint(
        address account,
        uint256 id,
        uint256 amount
    ) public onlyOwner {
        bytes memory data;

        _mint(account, id, amount, data);
    }

    /**
     * @dev                 burns specified amount token(s) of specific id from specified account
     * @param account       address of token holder
     * @param id            id of token, aka. tier
     * @param amount        units of token to be burnt from beneficiary
     */
    function burn(
        address account,
        uint256 id,
        uint256 amount
    ) public onlyOwner {
        _burn(account, id, amount);
    }

    /**
     * @dev                 mints to multiple addresses arbitrary units of tokens of ONE token id per address
     * @notice              example: mint 3 units of tokenId 1 to alice and 4 units of tokenId 2 to bob
     * @param accounts      list of beneficiary addresses
     * @param tokenIds      list of token ids (aka tiers)
     * @param amounts       list of mint amounts
     */
    function mintToMultiple(
        address[] calldata accounts,
        uint256[] calldata tokenIds,
        uint256[] calldata amounts
    ) public onlyOwner isSameLength(accounts, tokenIds, amounts) {
        bytes memory data;

        for (uint256 i = 0; i < accounts.length; i++) {
            _mint(accounts[i], tokenIds[i], amounts[i], data);
        }
    }

    /**
     * @dev                 burns from multiple addresses arbitrary units of tokens of ONE token id per address
     *                      example: burn 3 units of tokenId 1 from alice and 4 units of tokenId 2 froms bob
     * @param accounts      list of token holder addresses
     * @param tokenIds      list of token ids (aka tiers)
     * @param amounts       list of burn amounts
     */
    function burnFromMultiple(
        address[] calldata accounts,
        uint256[] calldata tokenIds,
        uint256[] calldata amounts
    ) public onlyOwner isSameLength(accounts, tokenIds, amounts) {
        for (uint256 i = 0; i < accounts.length; i++) {
            _burn(accounts[i], tokenIds[i], amounts[i]);
        }
    }

    /*
        Transferring
    */

    function setApprovalForAll(address, bool) public virtual override {
        revert TransferDisabled();
    }

    function _beforeTokenTransfer(
        address,
        address from,
        address to,
        uint256[] memory,
        uint256[] memory,
        bytes memory
    ) internal pure override {
        if (to != address(0) && from != address(0)) {
            revert TransferDisabled();
        }
    }

    /*
        Metadata
    */

    /**
     * @dev                 returns the uri for a given token
     * @notice              consists of a concatenation of baseUri and uriId
     * @param tokenId       tokenId for which the uri should be retrieved
     */
    function uri(uint256 tokenId)
        public
        view
        virtual
        override
        returns (string memory)
    {
        string memory baseUri = super.uri(tokenId);
        return string(abi.encodePacked(baseUri, tokenUris[tokenId]));
    }
}
