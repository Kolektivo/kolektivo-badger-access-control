import { expect } from "chai";
import hre, { deployments, waffle } from "hardhat";
import "@nomiclabs/hardhat-ethers";

describe.only("OnlyOwner", async () => {
  const baseSetup = deployments.createFixture(async () => {
    await deployments.fixture();
    const Avatar = await hre.ethers.getContractFactory("TestAvatar");
    const avatar = await Avatar.deploy();
    const TestContract = await hre.ethers.getContractFactory("TestContract");
    const testContract = await TestContract.deploy();
    return { Avatar, avatar, testContract };
  });

  const setupRolesWithOwnerAndInvoker = deployments.createFixture(async () => {
    const base = await baseSetup();

    const [owner, invoker, janeDoe] = waffle.provider.getWallets();

    const Permissions = await hre.ethers.getContractFactory("PermissionsDelay");
    const permissions = await Permissions.deploy();
    const Modifier = await hre.ethers.getContractFactory("BadgeRoles", {
      libraries: {
        PermissionsDelay: permissions.address,
      },
    });

    const Badger = await hre.ethers.getContractFactory("Badger");
    const badger = await Badger.deploy("ipfs://");

    const modifier = await Modifier.deploy(
      owner.address,
      base.avatar.address,
      base.avatar.address,
      badger.address
    );

    return {
      ...base,
      Modifier,
      modifier,
      owner,
      invoker,
      janeDoe,
      badger,
    };
  });

  const OPTIONS_NONE = 0;
  const OPTIONS_SEND = 1;
  const OPTIONS_DELEGATECALL = 2;
  const OPTIONS_BOTH = 3;

  const TYPE_STATIC = 0;
  const TYPE_DYNAMIC = 1;
  const TYPE_DYNAMIC32 = 2;

  it("onlyOwner for allowTarget simple invoker fails", async () => {
    const { modifier, testContract, owner, invoker, janeDoe } =
      await setupRolesWithOwnerAndInvoker();

    const BADGE_ID = 0;

    await expect(
      modifier
        .connect(invoker)
        .allowTarget(BADGE_ID, testContract.address, OPTIONS_NONE)
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await expect(
      modifier
        .connect(janeDoe)
        .allowTarget(BADGE_ID, testContract.address, OPTIONS_NONE)
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await expect(
      modifier
        .connect(owner)
        .allowTarget(BADGE_ID, testContract.address, OPTIONS_NONE)
    ).to.not.be.reverted;
  });

  it("onlyOwner for scopeTarget, simple invoker fails", async () => {
    const { modifier, testContract, owner, invoker, janeDoe } =
      await setupRolesWithOwnerAndInvoker();

    const BADGE_ID = 0;

    await expect(
      modifier.connect(invoker).scopeTarget(BADGE_ID, testContract.address)
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await expect(
      modifier.connect(janeDoe).scopeTarget(BADGE_ID, testContract.address)
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await expect(
      modifier.connect(owner).scopeTarget(BADGE_ID, testContract.address)
    ).to.not.be.reverted;
  });
  it("onlyOwner for revokeTarget, simple invoker fails", async () => {
    const { modifier, testContract, owner, invoker, janeDoe } =
      await setupRolesWithOwnerAndInvoker();

    const BADGE_ID = 0;

    await expect(
      modifier.connect(invoker).revokeTarget(BADGE_ID, testContract.address)
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await expect(
      modifier.connect(janeDoe).revokeTarget(BADGE_ID, testContract.address)
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await expect(
      modifier.connect(owner).revokeTarget(BADGE_ID, testContract.address)
    ).to.not.be.reverted;
  });

  it("onlyOwner for scopeAllowFunction, simple invoker fails", async () => {
    const { modifier, testContract, owner, invoker, janeDoe } =
      await setupRolesWithOwnerAndInvoker();

    const BADGE_ID = 0;
    const SELECTOR = testContract.interface.getSighash(
      testContract.interface.getFunction("doNothing")
    );

    await expect(
      modifier
        .connect(invoker)
        .scopeAllowFunction(
          BADGE_ID,
          testContract.address,
          SELECTOR,
          OPTIONS_NONE
        )
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await expect(
      modifier
        .connect(janeDoe)
        .scopeAllowFunction(
          BADGE_ID,
          testContract.address,
          SELECTOR,
          OPTIONS_NONE
        )
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await expect(
      modifier
        .connect(owner)
        .scopeAllowFunction(
          BADGE_ID,
          testContract.address,
          SELECTOR,
          OPTIONS_NONE
        )
    ).to.not.be.reverted;
  });
  it("onlyOwner for scopeRevokeFunction, simple invoker fails", async () => {
    const { modifier, testContract, owner, invoker, janeDoe } =
      await setupRolesWithOwnerAndInvoker();

    const BADGE_ID = 0;
    const SELECTOR = testContract.interface.getSighash(
      testContract.interface.getFunction("doNothing")
    );

    await expect(
      modifier
        .connect(invoker)
        .scopeRevokeFunction(BADGE_ID, testContract.address, SELECTOR)
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await expect(
      modifier
        .connect(janeDoe)
        .scopeRevokeFunction(BADGE_ID, testContract.address, SELECTOR)
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await expect(
      modifier
        .connect(owner)
        .scopeRevokeFunction(BADGE_ID, testContract.address, SELECTOR)
    ).to.not.be.reverted;
  });
  it("onlyOwner for scopeFunction, simple invoker fails", async () => {
    const { modifier, testContract, owner, invoker, janeDoe } =
      await setupRolesWithOwnerAndInvoker();

    const BADGE_ID = 0;
    const SELECTOR = testContract.interface.getSighash(
      testContract.interface.getFunction("doNothing")
    );

    await expect(
      modifier
        .connect(invoker)
        .scopeFunction(
          BADGE_ID,
          testContract.address,
          SELECTOR,
          [],
          [],
          [],
          [],
          OPTIONS_NONE
        )
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await expect(
      modifier
        .connect(janeDoe)
        .scopeFunction(
          BADGE_ID,
          testContract.address,
          SELECTOR,
          [],
          [],
          [],
          [],
          OPTIONS_NONE
        )
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await expect(
      modifier
        .connect(owner)
        .scopeFunction(
          BADGE_ID,
          testContract.address,
          SELECTOR,
          [],
          [],
          [],
          [],
          OPTIONS_NONE
        )
    ).to.not.be.reverted;
  });
  it("onlyOwner for scopeFunctionExecutionOptions, simple invoker fails", async () => {
    const { modifier, testContract, owner, invoker, janeDoe } =
      await setupRolesWithOwnerAndInvoker();

    const BADGE_ID = 0;
    const SELECTOR = testContract.interface.getSighash(
      testContract.interface.getFunction("doNothing")
    );

    await expect(
      modifier
        .connect(invoker)
        .scopeFunctionExecutionOptions(
          BADGE_ID,
          testContract.address,
          SELECTOR,
          OPTIONS_NONE
        )
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await expect(
      modifier
        .connect(invoker)
        .scopeFunctionExecutionOptions(
          BADGE_ID,
          testContract.address,
          SELECTOR,
          OPTIONS_NONE
        )
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await expect(
      modifier
        .connect(owner)
        .scopeFunctionExecutionOptions(
          BADGE_ID,
          testContract.address,
          SELECTOR,
          OPTIONS_NONE
        )
    ).to.not.be.reverted;
  });
  it("onlyOwner for scopeParameter, simple invoker fails", async () => {
    const { modifier, testContract, owner, invoker, janeDoe } =
      await setupRolesWithOwnerAndInvoker();

    const BADGE_ID = 0;
    const SELECTOR = testContract.interface.getSighash(
      testContract.interface.getFunction("doNothing")
    );

    await expect(
      modifier
        .connect(invoker)
        .scopeParameter(
          BADGE_ID,
          testContract.address,
          SELECTOR,
          0,
          TYPE_DYNAMIC,
          0,
          "0x"
        )
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await expect(
      modifier
        .connect(janeDoe)
        .scopeParameter(
          BADGE_ID,
          testContract.address,
          SELECTOR,
          0,
          TYPE_DYNAMIC,
          0,
          "0x"
        )
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await expect(
      modifier
        .connect(owner)
        .scopeParameter(
          BADGE_ID,
          testContract.address,
          SELECTOR,
          0,
          TYPE_DYNAMIC,
          0,
          "0x"
        )
    ).to.not.be.reverted;
  });
  it("onlyOwner for scopeParameterAsOneOf, simple invoker fails", async () => {
    const { modifier, testContract, owner, invoker, janeDoe } =
      await setupRolesWithOwnerAndInvoker();

    const BADGE_ID = 0;
    const SELECTOR = testContract.interface.getSighash(
      testContract.interface.getFunction("doNothing")
    );

    await expect(
      modifier
        .connect(invoker)
        .scopeParameterAsOneOf(
          BADGE_ID,
          testContract.address,
          SELECTOR,
          0,
          TYPE_DYNAMIC,
          ["0x12", "0x23"]
        )
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await expect(
      modifier
        .connect(janeDoe)
        .scopeParameterAsOneOf(
          BADGE_ID,
          testContract.address,
          SELECTOR,
          0,
          TYPE_DYNAMIC,
          ["0x12", "0x23"]
        )
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await expect(
      modifier
        .connect(owner)
        .scopeParameterAsOneOf(
          BADGE_ID,
          testContract.address,
          SELECTOR,
          0,
          TYPE_DYNAMIC,
          ["0x12", "0x23"]
        )
    ).to.not.be.reverted;
  });
  it("onlyOwner for unscopeParameter, simple invoker fails", async () => {
    const { modifier, testContract, owner, invoker, janeDoe } =
      await setupRolesWithOwnerAndInvoker();

    const BADGE_ID = 0;
    const SELECTOR = testContract.interface.getSighash(
      testContract.interface.getFunction("doNothing")
    );

    await expect(
      modifier
        .connect(invoker)
        .unscopeParameter(BADGE_ID, testContract.address, SELECTOR, 0)
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await expect(
      modifier
        .connect(janeDoe)
        .unscopeParameter(BADGE_ID, testContract.address, SELECTOR, 0)
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await expect(
      modifier
        .connect(owner)
        .unscopeParameter(BADGE_ID, testContract.address, SELECTOR, 0)
    ).to.not.be.reverted;
  });
});
