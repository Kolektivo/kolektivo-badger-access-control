// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2021 PrimeDao

pragma solidity ^0.8.6;

interface IBadger {
    function balanceOf(address account, uint256 id)
        external
        view
        returns (uint256);

    function mintBatch(
        address to,
        uint256[] memory ids,
        uint256[] memory amounts
    ) external view returns (uint256);

    function mint(
        address account,
        uint256 id,
        uint256 amount
    ) external;
}
