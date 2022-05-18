import { AddressOne } from "@gnosis.pm/safe-contracts";
import { expect } from "chai";
import hre, { deployments, waffle, ethers } from "hardhat";
import "@nomiclabs/hardhat-ethers";

import { buildContractCall, buildMultiSendSafeTx } from "./utils";

const ZeroAddress = "0x0000000000000000000000000000000000000000";
const FirstAddress = "0x0000000000000000000000000000000000000001";

describe("RolesModifier", async () => {
  const baseSetup = deployments.createFixture(async () => {
    await deployments.fixture();
    const Avatar = await hre.ethers.getContractFactory("TestAvatar");
    const avatar = await Avatar.deploy();
    const TestContract = await hre.ethers.getContractFactory("TestContract");
    const testContract = await TestContract.deploy();
    const Badger = await hre.ethers.getContractFactory("Badger");
    const badger = await Badger.deploy("ipfs://");

    return { Avatar, avatar, testContract, badger };
  });

  const setupTestWithTestAvatar = deployments.createFixture(async () => {
    const base = await baseSetup();
    const Permissions = await hre.ethers.getContractFactory("PermissionsDelay");
    const permissions = await Permissions.deploy();
    const Modifier = await hre.ethers.getContractFactory("BadgeRoles", {
      libraries: {
        PermissionsDelay: permissions.address,
      },
    });

    const modifier = await Modifier.deploy(
      base.avatar.address,
      base.avatar.address,
      base.avatar.address,
      base.badger.address
    );
    return { ...base, Modifier, modifier };
  });

  const setupRolesWithOwnerAndInvoker = deployments.createFixture(async () => {
    const base = await baseSetup();

    const [owner, invoker] = waffle.provider.getWallets();

    const Permissions = await hre.ethers.getContractFactory("PermissionsDelay");
    const permissions = await Permissions.deploy();
    const Modifier = await hre.ethers.getContractFactory("BadgeRoles", {
      libraries: {
        PermissionsDelay: permissions.address,
      },
    });

    const modifier = await Modifier.deploy(
      owner.address,
      base.avatar.address,
      base.avatar.address,
      base.badger.address
    );

    return {
      ...base,
      Modifier,
      modifier,
      owner,
      invoker,
    };
  });

  const TYPE_STATIC = 0;
  const TYPE_DYNAMIC = 1;
  const TYPE_DYNAMIC32 = 2;

  const txSetup = deployments.createFixture(async () => {
    const baseAvatar = await setupTestWithTestAvatar();
    const encodedParam_1 = ethers.utils.defaultAbiCoder.encode(
      ["address"],
      [user1.address]
    );
    const encodedParam_2 = ethers.utils.defaultAbiCoder.encode(
      ["uint256"],
      [99]
    );
    const encodedParam_3 = ethers.utils.solidityPack(
      ["string"],
      ["This is a dynamic array"]
    );
    const encodedParam_4 = ethers.utils.defaultAbiCoder.encode(
      ["uint256"],
      [4]
    );
    const encodedParam_5 = ethers.utils.solidityPack(["string"], ["Test"]);
    const encodedParam_6 = ethers.utils.defaultAbiCoder.encode(
      ["bool"],
      [true]
    );
    const encodedParam_7 = ethers.utils.defaultAbiCoder.encode(["uint8"], [3]);
    const encodedParam_8 = ethers.utils.solidityPack(["string"], ["weeeeeeee"]);
    const encodedParam_9 = ethers.utils.solidityPack(
      ["string"],
      [
        "This is an input that is larger than 32 bytes and must be scanned for correctness",
      ]
    );
    const tx_1 = buildContractCall(
      baseAvatar.testContract,
      "mint",
      [user1.address, 99],
      0
    );
    const tx_2 = buildContractCall(
      baseAvatar.testContract,
      "mint",
      [user1.address, 99],
      0
    );
    const tx_3 = await buildContractCall(
      baseAvatar.testContract,
      "testDynamic",
      [
        "This is a dynamic array",
        4,
        "Test",
        true,
        3,
        "weeeeeeee",
        "This is an input that is larger than 32 bytes and must be scanned for correctness",
      ],
      0
    );
    return {
      ...baseAvatar,
      encodedParam_1,
      encodedParam_2,
      encodedParam_3,
      encodedParam_4,
      encodedParam_5,
      encodedParam_6,
      encodedParam_7,
      encodedParam_8,
      encodedParam_9,
      tx_1,
      tx_2,
      tx_3,
    };
  });

  const [user1] = waffle.provider.getWallets();
  const OPTIONS_NONE = 0;
  const OPTIONS_SEND = 1;
  const OPTIONS_DELEGATECALL = 2;
  const OPTIONS_BOTH = 3;

  describe("setUp()", async () => {
    it("should emit event because of successful set up", async () => {
      const Permissions = await hre.ethers.getContractFactory(
        "PermissionsDelay"
      );
      const permissions = await Permissions.deploy();
      const Modifier = await hre.ethers.getContractFactory("BadgeRoles", {
        libraries: {
          PermissionsDelay: permissions.address,
        },
      });

      const modifier = await Modifier.deploy(
        user1.address,
        user1.address,
        user1.address,
        user1.address
      );
      await modifier.deployed();
      await expect(modifier.deployTransaction)
        .to.emit(modifier, "RolesModSetup")
        .withArgs(user1.address, user1.address, user1.address, user1.address);
    });
  });

  describe("badges as access control criteria", () => {
    it("assigns roles to a module", async () => {
      const BADGE_ID = 0;

      const { modifier, testContract, owner, invoker, badger } =
        await setupRolesWithOwnerAndInvoker();

      // blank allow all calls to testContract from role 0
      await modifier
        .connect(owner)
        .allowTarget(BADGE_ID, testContract.address, OPTIONS_NONE);

      // expect it to fail, before assigning role
      await expect(
        modifier
          .connect(invoker)
          .execTransactionFromModule(
            testContract.address,
            0,
            testContract.interface.encodeFunctionData("doNothing()"),
            0,
            BADGE_ID
          )
      ).to.be.revertedWith("NoMembership()");

      await badger.mint(invoker.address, BADGE_ID, 1);

      // expect it to succeed, after assigning role
      await expect(
        modifier
          .connect(invoker)
          .execTransactionFromModule(
            testContract.address,
            0,
            testContract.interface.encodeFunctionData("doNothing()"),
            0,
            BADGE_ID
          )
      ).to.emit(testContract, "DoNothing");
    });

    it("revokes roles to a module", async () => {
      const { modifier, testContract, owner, invoker, badger } =
        await setupRolesWithOwnerAndInvoker();

      const BADGE_ID = 0;

      // blank allow all calls to testContract from role 0
      await modifier
        .connect(owner)
        .allowTarget(BADGE_ID, testContract.address, OPTIONS_NONE);

      //authorize
      await badger.mint(invoker.address, BADGE_ID, 1);

      // expect it to succeed, after assigning role
      await expect(
        modifier
          .connect(invoker)
          .execTransactionFromModule(
            testContract.address,
            0,
            testContract.interface.encodeFunctionData("doNothing()"),
            0,
            BADGE_ID
          )
      ).to.emit(testContract, "DoNothing");

      //revoke
      await badger.burn(invoker.address, BADGE_ID, 1);

      // expect it to fail, after revoking
      await expect(
        modifier
          .connect(invoker)
          .execTransactionFromModule(
            testContract.address,
            0,
            testContract.interface.encodeFunctionData("doNothing()"),
            0,
            BADGE_ID
          )
      ).to.be.revertedWith("NoMembership()");
    });
  });

  describe("execTransactionFromModule()", () => {
    it("reverts if data is set and is not at least 4 bytes", async () => {
      const { modifier, testContract, invoker, badger } =
        await setupRolesWithOwnerAndInvoker();

      const BADGE_ID = 0;

      await badger.mint(invoker.address, BADGE_ID, 1);

      await expect(
        modifier
          .connect(invoker)
          .execTransactionFromModule(
            testContract.address,
            0,
            "0xab",
            0,
            BADGE_ID
          )
      ).to.be.revertedWith("FunctionSignatureTooShort()");
    });
    it("reverts if called from module not assigned any role", async () => {
      const { modifier, testContract, owner, badger } =
        await setupRolesWithOwnerAndInvoker();

      const BADGE_ID = 1;

      await modifier
        .connect(owner)
        .allowTarget(BADGE_ID, testContract.address, OPTIONS_NONE);
      const mint = await testContract.populateTransaction.mint(
        user1.address,
        99
      );

      await expect(
        modifier.execTransactionFromModule(
          testContract.address,
          0,
          mint.data,
          0,
          BADGE_ID
        )
      ).to.be.revertedWith("NoMembership()");
    });

    it("reverts if the call is not an allowed target", async () => {
      const { avatar, modifier, testContract, badger } = await txSetup();
      const BADGE_ID = 1;

      await badger.transferOwnership(avatar.address);

      const assign = await badger.populateTransaction.mint(
        user1.address,
        BADGE_ID,
        1
      );

      await avatar.exec(badger.address, 0, assign.data);

      const allowTargetAddress = await modifier.populateTransaction.allowTarget(
        BADGE_ID,
        testContract.address,
        OPTIONS_NONE
      );
      await avatar.exec(modifier.address, 0, allowTargetAddress.data);

      const mint = await testContract.populateTransaction.mint(
        user1.address,
        99
      );

      const someOtherAddress = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
      await expect(
        modifier.execTransactionFromModule(
          someOtherAddress,
          0,
          mint.data,
          0,
          BADGE_ID
        )
      ).to.be.revertedWith("TargetAddressNotAllowed()");
    });

    it("executes a call to an allowed target", async () => {
      const { avatar, modifier, testContract, badger } = await txSetup();
      const BADGE_ID = 1;

      await badger.transferOwnership(avatar.address);

      const assign = await badger.populateTransaction.mint(
        user1.address,
        BADGE_ID,
        1
      );
      await avatar.exec(badger.address, 0, assign.data);

      const allowTargetAddress = await modifier.populateTransaction.allowTarget(
        BADGE_ID,
        testContract.address,
        OPTIONS_NONE
      );
      await avatar.exec(modifier.address, 0, allowTargetAddress.data);

      const mint = await testContract.populateTransaction.mint(
        user1.address,
        99
      );

      await expect(
        modifier.execTransactionFromModule(
          testContract.address,
          0,
          mint.data,
          0,
          BADGE_ID
        )
      ).to.emit(testContract, "Mint");
    });

    it("reverts if value parameter is not allowed", async () => {
      const {
        avatar,
        modifier,
        testContract,
        encodedParam_1,
        encodedParam_2,
        badger,
      } = await txSetup();
      const BADGE_ID = 1;

      await badger.transferOwnership(avatar.address);

      const assign = await badger.populateTransaction.mint(
        user1.address,
        BADGE_ID,
        1
      );

      await avatar.exec(badger.address, 0, assign.data);

      const functionScoped = await modifier.populateTransaction.scopeTarget(
        BADGE_ID,
        testContract.address
      );
      await avatar.exec(modifier.address, 0, functionScoped.data);

      const paramScoped = await modifier.populateTransaction.scopeFunction(
        1,
        testContract.address,
        "0x40c10f19",
        [true, true],
        [TYPE_STATIC, TYPE_STATIC],
        [0, 0],
        [encodedParam_1, encodedParam_2],
        OPTIONS_NONE
      );
      await avatar.exec(modifier.address, 0, paramScoped.data);

      const mint = await testContract.populateTransaction.mint(
        user1.address,
        98
      );

      await expect(
        modifier.execTransactionFromModule(
          testContract.address,
          0,
          mint.data,
          0,
          BADGE_ID
        )
      ).to.be.revertedWith("ParameterNotAllowed()");
    });

    it("executes a call with allowed value parameter", async () => {
      const user1 = (await hre.ethers.getSigners())[0];
      const BADGE_ID = 1;
      const {
        avatar,
        modifier,
        testContract,
        encodedParam_1,
        encodedParam_2,
        badger,
      } = await txSetup();

      await badger.transferOwnership(avatar.address);

      const assign = await badger.populateTransaction.mint(
        user1.address,
        BADGE_ID,
        1
      );
      await avatar.exec(badger.address, 0, assign.data);

      const functionScoped = await modifier.populateTransaction.scopeTarget(
        1,
        testContract.address
      );
      await avatar.exec(modifier.address, 0, functionScoped.data);

      const paramScoped = await modifier.populateTransaction.scopeFunction(
        1,
        testContract.address,
        "0x40c10f19",
        [true, true],
        [TYPE_STATIC, TYPE_STATIC],
        [0, 0],
        [encodedParam_1, encodedParam_2],
        OPTIONS_NONE
      );
      await avatar.exec(modifier.address, 0, paramScoped.data);

      const mint = await testContract.populateTransaction.mint(
        user1.address,
        99
      );

      await expect(
        modifier.execTransactionFromModule(
          testContract.address,
          0,
          mint.data,
          0,
          BADGE_ID
        )
      ).to.emit(testContract, "Mint");
    });

    it("reverts dynamic parameter is not allowed", async () => {
      const {
        avatar,
        modifier,
        testContract,
        encodedParam_3,
        encodedParam_4,
        encodedParam_5,
        encodedParam_6,
        encodedParam_7,
        encodedParam_8,
        encodedParam_9,
        badger,
      } = await txSetup();
      const BADGE_ID = 1;

      await badger.transferOwnership(avatar.address);
      const assign = await badger.populateTransaction.mint(
        user1.address,
        BADGE_ID,
        1
      );

      await avatar.exec(badger.address, 0, assign.data);

      const functionScoped = await modifier.populateTransaction.scopeTarget(
        1,
        testContract.address
      );
      await avatar.exec(modifier.address, 0, functionScoped.data);

      const paramScoped = await modifier.populateTransaction.scopeFunction(
        1,
        testContract.address,
        "0x273454bf",
        [true, true, true, true, true, true, true],
        [
          TYPE_DYNAMIC,
          TYPE_STATIC,
          TYPE_DYNAMIC,
          TYPE_STATIC,
          TYPE_STATIC,
          TYPE_DYNAMIC,
          TYPE_DYNAMIC,
        ],
        [0, 0, 0, 0, 0, 0, 0],
        [
          encodedParam_3,
          encodedParam_4,
          encodedParam_5,
          encodedParam_6,
          encodedParam_7,
          encodedParam_8,
          encodedParam_9,
        ],
        OPTIONS_NONE
      );
      await avatar.exec(modifier.address, 0, paramScoped.data);

      const dynamic = await testContract.populateTransaction.testDynamic(
        "This is a dynamic array that is not allowed",
        4,
        "Test",
        true,
        3,
        "weeeeeeee",
        "This is an input that is larger than 32 bytes and must be scanned for correctness"
      );

      await expect(
        modifier.execTransactionFromModule(
          testContract.address,
          0,
          dynamic.data,
          0,
          BADGE_ID
        )
      ).to.be.revertedWith("ParameterNotAllowed()");
    });

    it("executes a call with allowed dynamic parameter", async () => {
      const {
        avatar,
        modifier,
        testContract,
        encodedParam_3,
        encodedParam_4,
        encodedParam_5,
        encodedParam_6,
        encodedParam_7,
        encodedParam_8,
        encodedParam_9,
        badger,
      } = await txSetup();
      const BADGE_ID = 1;

      await badger.transferOwnership(avatar.address);

      const assign = await badger.populateTransaction.mint(
        user1.address,
        BADGE_ID,
        1
      );

      await avatar.exec(badger.address, 0, assign.data);

      const functionScoped = await modifier.populateTransaction.scopeTarget(
        1,
        testContract.address
      );
      await avatar.exec(modifier.address, 0, functionScoped.data);

      const paramScoped = await modifier.populateTransaction.scopeFunction(
        1,
        testContract.address,
        "0x273454bf",
        [true, true, true, true, true, true, true],
        [
          TYPE_DYNAMIC,
          TYPE_STATIC,
          TYPE_DYNAMIC,
          TYPE_STATIC,
          TYPE_STATIC,
          TYPE_DYNAMIC,
          TYPE_DYNAMIC,
        ],
        [0, 0, 0, 0, 0, 0, 0],
        [
          encodedParam_3,
          encodedParam_4,
          encodedParam_5,
          encodedParam_6,
          encodedParam_7,
          encodedParam_8,
          encodedParam_9,
        ],
        OPTIONS_NONE
      );
      await avatar.exec(modifier.address, 0, paramScoped.data);

      const dynamic = await testContract.populateTransaction.testDynamic(
        "This is a dynamic array",
        4,
        "Test",
        true,
        3,
        "weeeeeeee",
        "This is an input that is larger than 32 bytes and must be scanned for correctness"
      );

      await expect(
        modifier.execTransactionFromModule(
          testContract.address,
          0,
          dynamic.data,
          0,
          BADGE_ID
        )
      ).to.emit(testContract, "TestDynamic");
    });

    it("reverts a call with multisend tx", async () => {
      const {
        avatar,
        modifier,
        testContract,
        encodedParam_1,
        encodedParam_2,
        encodedParam_3,
        encodedParam_4,
        encodedParam_5,
        encodedParam_6,
        encodedParam_7,
        encodedParam_8,
        encodedParam_9,
        tx_1,
        tx_2,
        tx_3,
        badger,
      } = await txSetup();
      const BADGE_ID = 1;

      await badger.transferOwnership(avatar.address);

      const MultiSend = await hre.ethers.getContractFactory("MultiSend");
      const multisend = await MultiSend.deploy();

      const assign = await badger.populateTransaction.mint(
        user1.address,
        BADGE_ID,
        1
      );
      await avatar.exec(badger.address, 0, assign.data);

      const multiSendTarget = await modifier.populateTransaction.setMultisend(
        multisend.address
      );
      await avatar.exec(modifier.address, 0, multiSendTarget.data);

      const scopeTarget = await modifier.populateTransaction.scopeTarget(
        1,
        testContract.address
      );
      await avatar.exec(modifier.address, 0, scopeTarget.data);

      const paramScoped = await modifier.populateTransaction.scopeFunction(
        1,
        testContract.address,
        "0x40c10f19",
        [true, true],
        [TYPE_STATIC, TYPE_STATIC],
        [0, 0],
        [encodedParam_1, encodedParam_2],
        OPTIONS_NONE
      );
      await avatar.exec(modifier.address, 0, paramScoped.data);

      const paramScoped_2 = await modifier.populateTransaction.scopeFunction(
        1,
        testContract.address,
        "0x273454bf",
        [true, true, true, true, true, true, true],
        [
          TYPE_DYNAMIC,
          TYPE_STATIC,
          TYPE_DYNAMIC,
          TYPE_STATIC,
          TYPE_STATIC,
          TYPE_DYNAMIC,
          TYPE_DYNAMIC,
        ],
        [0, 0, 0, 0, 0, 0, 0],
        [
          encodedParam_3,
          encodedParam_4,
          encodedParam_5,
          encodedParam_6,
          encodedParam_7,
          encodedParam_8,
          encodedParam_9,
        ],
        OPTIONS_NONE
      );
      await avatar.exec(modifier.address, 0, paramScoped_2.data);

      const tx_bad = buildContractCall(
        testContract,
        "mint",
        [user1.address, 98],
        0
      );

      const multiTx = buildMultiSendSafeTx(
        multisend,
        [tx_1, tx_2, tx_3, tx_bad, tx_2, tx_3],
        0
      );

      await expect(
        modifier.execTransactionFromModule(
          multisend.address,
          0,
          multiTx.data,
          1,
          BADGE_ID
        )
      ).to.be.revertedWith("ParameterNotAllowed()");
    });

    it("reverts if multisend tx data offset is not 32 bytes", async () => {
      const {
        avatar,
        modifier,
        testContract,
        encodedParam_1,
        encodedParam_2,
        tx_1,
        badger,
      } = await txSetup();
      const BADGE_ID = 1;

      await badger.transferOwnership(avatar.address);

      const assign = await badger.populateTransaction.mint(
        user1.address,
        BADGE_ID,
        1
      );
      await avatar.exec(badger.address, 0, assign.data);

      const MultiSend = await hre.ethers.getContractFactory("MultiSend");
      const multisend = await MultiSend.deploy();

      const multiSendTarget = await modifier.populateTransaction.setMultisend(
        multisend.address
      );
      await avatar.exec(modifier.address, 0, multiSendTarget.data);

      const functionScoped = await modifier.populateTransaction.scopeTarget(
        1,
        testContract.address
      );
      await avatar.exec(modifier.address, 0, functionScoped.data);

      const paramScoped = await modifier.populateTransaction.scopeFunction(
        1,
        testContract.address,
        "0x40c10f19",
        [true, true],
        [TYPE_STATIC, TYPE_STATIC],
        [0, 0],
        [encodedParam_1, encodedParam_2],
        OPTIONS_NONE
      );
      await avatar.exec(modifier.address, 0, paramScoped.data);

      const multiTx = buildMultiSendSafeTx(multisend, [tx_1], 0);

      // setting offset to 0x21 bytes instead of 0x20
      multiTx.data = multiTx.data.substr(0, 73) + "1" + multiTx.data.substr(74);

      await expect(
        modifier.execTransactionFromModule(
          multisend.address,
          0,
          multiTx.data,
          1,
          BADGE_ID
        )
      ).to.be.revertedWith("UnacceptableMultiSendOffset()");
    });

    it("executes a call with multisend tx", async () => {
      const {
        avatar,
        modifier,
        testContract,
        encodedParam_1,
        encodedParam_2,
        encodedParam_3,
        encodedParam_4,
        encodedParam_5,
        encodedParam_6,
        encodedParam_7,
        encodedParam_8,
        encodedParam_9,
        tx_1,
        tx_2,
        tx_3,
        badger,
      } = await txSetup();
      const BADGE_ID = 1;

      await badger.transferOwnership(avatar.address);

      const assign = await badger.populateTransaction.mint(
        user1.address,
        BADGE_ID,
        1
      );
      await avatar.exec(badger.address, 0, assign.data);

      const MultiSend = await hre.ethers.getContractFactory("MultiSend");
      const multisend = await MultiSend.deploy();

      const multiSendTarget = await modifier.populateTransaction.setMultisend(
        multisend.address
      );
      await avatar.exec(modifier.address, 0, multiSendTarget.data);

      const scopeTarget = await modifier.populateTransaction.scopeTarget(
        1,
        testContract.address
      );
      await avatar.exec(modifier.address, 0, scopeTarget.data);

      const paramScoped = await modifier.populateTransaction.scopeFunction(
        1,
        testContract.address,
        "0x40c10f19",
        [true, true],
        [TYPE_STATIC, TYPE_STATIC],
        [0, 0],
        [encodedParam_1, encodedParam_2],
        OPTIONS_NONE
      );
      await avatar.exec(modifier.address, 0, paramScoped.data);

      const paramScoped_2 = await modifier.populateTransaction.scopeFunction(
        1,
        testContract.address,
        "0x273454bf",
        [true, true, true, true, true, true, true],
        [
          TYPE_DYNAMIC,
          TYPE_STATIC,
          TYPE_DYNAMIC,
          TYPE_STATIC,
          TYPE_STATIC,
          TYPE_DYNAMIC,
          TYPE_DYNAMIC,
        ],
        [0, 0, 0, 0, 0, 0, 0],
        [
          encodedParam_3,
          encodedParam_4,
          encodedParam_5,
          encodedParam_6,
          encodedParam_7,
          encodedParam_8,
          encodedParam_9,
        ],
        OPTIONS_NONE
      );
      await avatar.exec(modifier.address, 0, paramScoped_2.data);

      const multiTx = buildMultiSendSafeTx(
        multisend,
        [tx_1, tx_2, tx_3, tx_1, tx_2, tx_3],
        0
      );

      await expect(
        modifier.execTransactionFromModule(
          multisend.address,
          0,
          multiTx.data,
          1,
          BADGE_ID
        )
      ).to.emit(testContract, "TestDynamic");
    });

    it("reverts if value parameter is less than allowed", async () => {
      const { avatar, modifier, testContract, encodedParam_1, badger } =
        await txSetup();
      const BADGE_ID = 1;

      await badger.transferOwnership(avatar.address);

      const assign = await badger.populateTransaction.mint(
        user1.address,
        BADGE_ID,
        1
      );
      await avatar.exec(badger.address, 0, assign.data);

      const scopeTarget = await modifier.populateTransaction.scopeTarget(
        1,
        testContract.address
      );
      await avatar.exec(modifier.address, 0, scopeTarget.data);

      const encodedParam_2 = ethers.utils.defaultAbiCoder.encode(
        ["uint256"],
        [99]
      );

      const paramScoped = await modifier.populateTransaction.scopeFunction(
        1,
        testContract.address,
        "0x40c10f19",
        [true, true],
        [TYPE_STATIC, TYPE_STATIC],
        [0, 1],
        [encodedParam_1, encodedParam_2], // set param 2 to greater than
        OPTIONS_NONE
      );
      await avatar.exec(modifier.address, 0, paramScoped.data);

      const mint = await testContract.populateTransaction.mint(
        user1.address,
        98
      );

      await expect(
        modifier.execTransactionFromModule(
          testContract.address,
          0,
          mint.data,
          0,
          BADGE_ID
        )
      ).to.be.revertedWith("ParameterLessThanAllowed");
    });

    it("executes if value parameter is greater than allowed", async () => {
      const { avatar, modifier, testContract, encodedParam_1, badger } =
        await txSetup();
      const BADGE_ID = 1;

      await badger.transferOwnership(avatar.address);

      const assign = await badger.populateTransaction.mint(
        user1.address,
        BADGE_ID,
        1
      );
      await avatar.exec(badger.address, 0, assign.data);

      const functionScoped = await modifier.populateTransaction.scopeTarget(
        1,
        testContract.address
      );
      await avatar.exec(modifier.address, 0, functionScoped.data);

      const encodedParam_2 = ethers.utils.defaultAbiCoder.encode(
        ["uint256"],
        [99]
      );

      const paramScoped = await modifier.populateTransaction.scopeFunction(
        1,
        testContract.address,
        "0x40c10f19",
        [true, true],
        [TYPE_STATIC, TYPE_STATIC],
        [0, 1],
        [encodedParam_1, encodedParam_2], // set param 2 to greater than
        OPTIONS_NONE
      );
      await avatar.exec(modifier.address, 0, paramScoped.data);

      const mint = await testContract.populateTransaction.mint(
        user1.address,
        100
      );

      await expect(
        modifier.execTransactionFromModule(
          testContract.address,
          0,
          mint.data,
          0,
          BADGE_ID
        )
      ).to.emit(testContract, "Mint");
    });

    it("reverts if value parameter is greater than allowed", async () => {
      const { avatar, modifier, testContract, encodedParam_1, badger } =
        await txSetup();
      const BADGE_ID = 1;

      await badger.transferOwnership(avatar.address);

      const assign = await badger.populateTransaction.mint(
        user1.address,
        BADGE_ID,
        1
      );
      await avatar.exec(badger.address, 0, assign.data);

      const functionScoped = await modifier.populateTransaction.scopeTarget(
        1,
        testContract.address
      );
      await avatar.exec(modifier.address, 0, functionScoped.data);

      const encodedParam_2 = ethers.utils.defaultAbiCoder.encode(
        ["uint256"],
        [99]
      );

      const paramScoped = await modifier.populateTransaction.scopeFunction(
        1,
        testContract.address,
        "0x40c10f19",
        [true, true],
        [TYPE_STATIC, TYPE_STATIC],
        [0, 2],
        [encodedParam_1, encodedParam_2], // set param 2 to less than
        OPTIONS_NONE
      );
      await avatar.exec(modifier.address, 0, paramScoped.data);

      const mint = await testContract.populateTransaction.mint(
        user1.address,
        100
      );

      await expect(
        modifier.execTransactionFromModule(
          testContract.address,
          0,
          mint.data,
          0,
          BADGE_ID
        )
      ).to.be.revertedWith("ParameterGreaterThanAllowed");
    });

    it("executes if value parameter is less than allowed", async () => {
      const { avatar, modifier, testContract, encodedParam_1, badger } =
        await txSetup();
      const BADGE_ID = 1;

      await badger.transferOwnership(avatar.address);

      const assign = await badger.populateTransaction.mint(
        user1.address,
        BADGE_ID,
        1
      );
      await avatar.exec(badger.address, 0, assign.data);

      const functionScoped = await modifier.populateTransaction.scopeTarget(
        1,
        testContract.address
      );
      await avatar.exec(modifier.address, 0, functionScoped.data);

      const encodedParam_2 = ethers.utils.defaultAbiCoder.encode(
        ["uint256"],
        [99]
      );

      const paramScoped = await modifier.populateTransaction.scopeFunction(
        1,
        testContract.address,
        "0x40c10f19",
        [true, true],
        [TYPE_STATIC, TYPE_STATIC],
        [0, 2],
        [encodedParam_1, encodedParam_2], // set param 2 to less than
        OPTIONS_NONE
      );
      await avatar.exec(modifier.address, 0, paramScoped.data);

      const mint = await testContract.populateTransaction.mint(
        user1.address,
        98
      );

      await expect(
        modifier.execTransactionFromModule(
          testContract.address,
          0,
          mint.data,
          0,
          BADGE_ID
        )
      ).to.emit(testContract, "Mint");
    });
  });

  describe("execTransactionFromModuleReturnData()", () => {
    it("reverts if called from module not assigned any role", async () => {
      const { avatar, modifier, testContract } = await txSetup();
      const BADGE_ID = 1;

      const allowTargetAddress = await modifier.populateTransaction.allowTarget(
        BADGE_ID,
        testContract.address,
        OPTIONS_NONE
      );
      await avatar.exec(modifier.address, 0, allowTargetAddress.data);

      const mint = await testContract.populateTransaction.mint(
        user1.address,
        99
      );

      await expect(
        modifier.execTransactionFromModuleReturnData(
          testContract.address,
          0,
          mint.data,
          1,
          BADGE_ID
        )
      ).to.be.revertedWith("NoMembership()");
    });

    it("reverts if the call is not an allowed target", async () => {
      const { avatar, modifier, testContract, badger } = await txSetup();
      const BADGE_ID = 1;

      await badger.transferOwnership(avatar.address);
      const assign = await badger
        .connect(avatar.address)
        .populateTransaction.mint(user1.address, 1, 1);
      await avatar.exec(badger.address, 0, assign.data);

      const allowTargetAddress = await modifier.populateTransaction.allowTarget(
        1,
        testContract.address,
        OPTIONS_NONE
      );
      await avatar.exec(modifier.address, 0, allowTargetAddress.data);

      const mint = await testContract.populateTransaction.mint(
        user1.address,
        99
      );

      const someOtherAddress = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
      await expect(
        modifier.execTransactionFromModuleReturnData(
          someOtherAddress,
          0,
          mint.data,
          0,
          BADGE_ID
        )
      ).to.be.revertedWith("TargetAddressNotAllowed()");
    });

    it("executes a call to an allowed target", async () => {
      const { avatar, modifier, testContract, badger } = await txSetup();
      const BADGE_ID = 1;

      await badger.transferOwnership(avatar.address);
      const assign = await badger
        .connect(avatar.address)
        .populateTransaction.mint(user1.address, 1, 1);
      await avatar.exec(badger.address, 0, assign.data);

      const allowTargetAddress = await modifier.populateTransaction.allowTarget(
        BADGE_ID,
        testContract.address,
        OPTIONS_NONE
      );
      await avatar.exec(modifier.address, 0, allowTargetAddress.data);

      const mint = await testContract.populateTransaction.mint(
        user1.address,
        99
      );

      await expect(
        modifier.execTransactionFromModule(
          testContract.address,
          0,
          mint.data,
          0,
          BADGE_ID
        )
      ).to.emit(testContract, "Mint");
    });
  });

  describe("setMultisend()", () => {
    it("reverts if not authorized", async () => {
      const { modifier } = await txSetup();
      await expect(modifier.setMultisend(AddressOne)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });

    it("sets multisend address to true", async () => {
      const { avatar, modifier } = await txSetup();
      const tx = await modifier.populateTransaction.setMultisend(AddressOne);
      await avatar.exec(modifier.address, 0, tx.data);
      expect(await modifier.multisend()).to.be.equals(AddressOne);
    });

    it("emits event with correct params", async () => {
      const { avatar, modifier } = await txSetup();
      const tx = await modifier.populateTransaction.setMultisend(AddressOne);
      await expect(avatar.exec(modifier.address, 0, tx.data))
        .to.emit(modifier, "SetMultisendAddress")
        .withArgs(AddressOne);
    });
  });

  describe("allowTarget()", () => {
    it("reverts if not authorized", async () => {
      const { modifier } = await txSetup();
      await expect(
        modifier.allowTarget(1, AddressOne, OPTIONS_NONE)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("sets allowed address to true", async () => {
      const { modifier, testContract, owner, invoker, badger } =
        await setupRolesWithOwnerAndInvoker();

      const BADGE_ID = 1;

      const doNothingArgs = [
        testContract.address,
        0,
        testContract.interface.encodeFunctionData("doNothing()"),
        0,
      ];

      // expect to fail due to no permissions
      await expect(
        modifier
          .connect(invoker)
          .execTransactionFromModule(...doNothingArgs, BADGE_ID)
      ).to.be.revertedWith("NoMembership()");

      // allow testContract address for role
      await expect(
        modifier
          .connect(owner)
          .allowTarget(BADGE_ID, testContract.address, OPTIONS_NONE)
      ).not.to.be.reverted;

      // expect to fail with default role
      await expect(
        modifier
          .connect(invoker)
          .execTransactionFromModule(...doNothingArgs, BADGE_ID)
      ).to.be.revertedWith("NoMembership()");

      // assign a role to invoker
      await badger.mint(invoker.address, BADGE_ID, 1);

      // should work with the configured role
      await expect(
        modifier
          .connect(invoker)
          .execTransactionFromModule(...doNothingArgs, BADGE_ID)
      ).to.emit(testContract, "DoNothing");
    });

    it("sets allowed address to false", async () => {
      const { modifier, testContract, owner, invoker, badger } =
        await setupRolesWithOwnerAndInvoker();

      const SHOULD_REVERT = true;
      const BADGE_ID = 1;

      const execWithRoleArgs = [
        testContract.address,
        0,
        testContract.interface.encodeFunctionData("doNothing()"),
        0,
        BADGE_ID,
      ];

      // assign a role to invoker
      await badger.mint(invoker.address, BADGE_ID, 1);

      // allow testContract address for role
      await expect(
        modifier
          .connect(owner)
          .allowTarget(BADGE_ID, testContract.address, OPTIONS_NONE)
      );

      // this call should work
      await expect(
        modifier.connect(invoker).execTransactionFromModule(...execWithRoleArgs)
      ).to.emit(testContract, "DoNothing");

      // Revoke access
      await expect(
        modifier.connect(owner).revokeTarget(BADGE_ID, testContract.address)
      ).to.not.be.reverted;

      // fails after revoke
      await expect(
        modifier.connect(invoker).execTransactionFromModule(...execWithRoleArgs)
      ).to.be.revertedWith("TargetAddressNotAllowed()");
    });
  });

  describe("allowTarget() canDelegate", () => {
    it("reverts if not authorized", async () => {
      const { modifier } = await txSetup();
      await expect(
        modifier.allowTarget(1, AddressOne, OPTIONS_DELEGATECALL)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("sets allowed address to true", async () => {
      const { modifier, testContract, owner, invoker, badger } =
        await setupRolesWithOwnerAndInvoker();

      const BADGE_ID = 1;
      await badger.mint(invoker.address, BADGE_ID, 1);

      const execArgs = [
        testContract.address,
        0,
        testContract.interface.encodeFunctionData("doNothing()"),
        1,
      ];

      // allow calls (but not delegate)
      await modifier
        .connect(owner)
        .allowTarget(BADGE_ID, testContract.address, OPTIONS_NONE);

      // still getting the delegateCallNotAllowed error
      await expect(
        modifier
          .connect(invoker)
          .execTransactionFromModule(...execArgs, BADGE_ID)
      ).to.be.revertedWith("DelegateCallNotAllowed()");

      // allow delegate calls to address
      await modifier
        .connect(owner)
        .allowTarget(BADGE_ID, testContract.address, OPTIONS_DELEGATECALL);

      // ok
      await expect(
        modifier
          .connect(invoker)
          .execTransactionFromModule(
            testContract.address,
            0,
            testContract.interface.encodeFunctionData("doNothing()"),
            1,
            BADGE_ID
          )
      ).to.not.be.reverted;
    });

    it("sets allowed address to false", async () => {
      const { modifier, testContract, owner, invoker, badger } =
        await setupRolesWithOwnerAndInvoker();

      const BADGE_ID = 1;
      await badger.mint(invoker.address, BADGE_ID, 1);

      const execArgs = [
        testContract.address,
        0,
        testContract.interface.encodeFunctionData("doNothing()"),
        1,
      ];

      await modifier
        .connect(owner)
        .allowTarget(BADGE_ID, testContract.address, OPTIONS_DELEGATECALL);

      // ok
      await expect(
        modifier
          .connect(invoker)
          .execTransactionFromModule(
            testContract.address,
            0,
            testContract.interface.encodeFunctionData("doNothing()"),
            1,
            BADGE_ID
          )
      ).to.not.be.reverted;

      // revoke delegate calls to address
      await modifier
        .connect(owner)
        .allowTarget(BADGE_ID, testContract.address, OPTIONS_NONE);

      // still getting the delegateCallNotAllowed error
      await expect(
        modifier
          .connect(invoker)
          .execTransactionFromModule(...execArgs, BADGE_ID)
      ).to.be.revertedWith("DelegateCallNotAllowed()");
    });
  });

  describe("scopeFunction()", () => {
    it("reverts if not authorized", async () => {
      const { modifier } = await txSetup();
      await expect(
        modifier.scopeFunction(
          1,
          AddressOne,
          "0x12345678",
          [true, true],
          [TYPE_DYNAMIC, TYPE_DYNAMIC],
          [1, 1],
          ["0x", "0x"],
          OPTIONS_NONE
        )
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("sets parameters scoped to true", async () => {
      const { modifier, testContract, owner, invoker, badger } =
        await setupRolesWithOwnerAndInvoker();

      const BADGE_ID = 1;
      const COMP_TYPE_EQ = 0;
      const SELECTOR = testContract.interface.getSighash(
        testContract.interface.getFunction("fnWithSingleParam")
      );
      const EXEC_ARGS = (n: number) => [
        testContract.address,
        0,
        testContract.interface.encodeFunctionData(
          "fnWithSingleParam(uint256)",
          [n]
        ),
        0,
      ];

      await badger.mint(invoker.address, BADGE_ID, 1);

      await modifier
        .connect(owner)
        .allowTarget(BADGE_ID, testContract.address, OPTIONS_NONE);

      // works before making function parameter scoped
      await expect(
        modifier
          .connect(invoker)
          .execTransactionFromModule(...EXEC_ARGS(1), BADGE_ID)
      ).to.not.be.reverted;

      await modifier.connect(owner).scopeTarget(BADGE_ID, testContract.address);

      await modifier
        .connect(owner)
        .scopeFunction(
          BADGE_ID,
          testContract.address,
          SELECTOR,
          [true],
          [TYPE_STATIC],
          [COMP_TYPE_EQ],
          [ethers.utils.defaultAbiCoder.encode(["uint256"], [2])],
          OPTIONS_NONE
        );

      // ngmi
      await expect(
        modifier
          .connect(invoker)
          .execTransactionFromModule(...EXEC_ARGS(1), BADGE_ID)
      ).to.be.revertedWith("ParameterNotAllowed");

      // gmi
      await expect(
        modifier
          .connect(invoker)
          .execTransactionFromModule(...EXEC_ARGS(2), BADGE_ID)
      ).to.not.be.reverted;
    });
  });

  describe("allowTarget - canSend", () => {
    it("reverts if not authorized", async () => {
      const { modifier } = await txSetup();
      const BADGE_ID = 1;

      await expect(
        modifier.allowTarget(BADGE_ID, AddressOne, OPTIONS_SEND)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("sets send allowed to true", async () => {
      const { modifier, testContract, owner, invoker, badger } =
        await setupRolesWithOwnerAndInvoker();

      const BADGE_ID = 1;

      await badger.mint(invoker.address, BADGE_ID, 1);

      await modifier
        .connect(owner)
        .allowTarget(BADGE_ID, testContract.address, OPTIONS_NONE);

      await expect(
        modifier
          .connect(invoker)
          .execTransactionFromModuleReturnData(
            testContract.address,
            1,
            "0x",
            0,
            BADGE_ID
          )
      ).to.be.revertedWith("SendNotAllowed");

      await modifier
        .connect(owner)
        .allowTarget(BADGE_ID, testContract.address, OPTIONS_SEND);

      await expect(
        modifier
          .connect(invoker)
          .execTransactionFromModuleReturnData(
            testContract.address,
            10000,
            "0x",
            0,
            BADGE_ID
          )
      ).to.not.be.reverted;
    });

    it("sets send allowed to false", async () => {
      const { modifier, testContract, owner, invoker, badger } =
        await setupRolesWithOwnerAndInvoker();

      const BADGE_ID = 1;
      await badger.mint(invoker.address, BADGE_ID, 1);

      await modifier
        .connect(owner)
        .allowTarget(BADGE_ID, testContract.address, OPTIONS_SEND);

      // should work with sendAllowed true
      await expect(
        modifier
          .connect(invoker)
          .execTransactionFromModuleReturnData(
            testContract.address,
            10000,
            "0x",
            0,
            BADGE_ID
          )
      ).to.not.be.reverted;

      await modifier
        .connect(owner)
        .allowTarget(BADGE_ID, testContract.address, OPTIONS_NONE);

      // should work with sendAllowed false
      await expect(
        modifier
          .connect(invoker)
          .execTransactionFromModuleReturnData(
            testContract.address,
            1,
            "0x",
            0,
            BADGE_ID
          )
      ).to.be.revertedWith("SendNotAllowed");
    });
  });

  describe("scopeAllowFunction()", () => {
    it("reverts if not authorized", async () => {
      const { modifier } = await txSetup();
      await expect(
        modifier.scopeAllowFunction(1, AddressOne, "0x12345678", OPTIONS_NONE)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("toggles allowed function false -> true -> false", async () => {
      const { modifier, testContract, owner, invoker, badger } =
        await setupRolesWithOwnerAndInvoker();

      const BADGE_ID = 1;
      const SELECTOR = testContract.interface.getSighash(
        testContract.interface.getFunction("doNothing")
      );

      const EXEC_ARGS = [
        testContract.address,
        0,
        testContract.interface.encodeFunctionData("doNothing()"),
        0,
        BADGE_ID,
      ];

      await badger.mint(invoker.address, BADGE_ID, 1);

      await modifier.connect(owner).scopeTarget(BADGE_ID, testContract.address);

      // allow the function
      await modifier
        .connect(owner)
        .scopeAllowFunction(
          BADGE_ID,
          testContract.address,
          SELECTOR,
          OPTIONS_NONE
        );

      // gmi
      await expect(
        modifier.connect(invoker).execTransactionFromModule(...EXEC_ARGS)
      ).to.emit(testContract, "DoNothing");

      // revoke the function
      await modifier
        .connect(owner)
        .scopeRevokeFunction(BADGE_ID, testContract.address, SELECTOR);

      // ngmi again
      await expect(
        modifier.connect(invoker).execTransactionFromModule(...EXEC_ARGS)
      ).to.be.revertedWith("FunctionNotAllowed");
    });
  });
});
