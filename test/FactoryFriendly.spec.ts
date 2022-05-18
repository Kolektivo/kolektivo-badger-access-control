import { AddressOne } from "@gnosis.pm/safe-contracts";
import { expect } from "chai";
import { AbiCoder } from "ethers/lib/utils";
import hre, { deployments, ethers } from "hardhat";
import "@nomiclabs/hardhat-ethers";

const FirstAddress = "0x0000000000000000000000000000000000000001";
const saltNonce = "0xfa";

describe("Module works with factory", () => {
  const paramsTypes = ["address", "address", "address", "address"];

  const baseSetup = deployments.createFixture(async () => {
    await deployments.fixture();
    const Factory = await hre.ethers.getContractFactory("ModuleProxyFactory");
    const factory = await Factory.deploy();

    const Badger = await hre.ethers.getContractFactory("Badger");
    const badger = await Badger.deploy("ipfs://");

    const Permissions = await hre.ethers.getContractFactory("PermissionsDelay");
    const permissions = await Permissions.deploy();
    const Modifier = await hre.ethers.getContractFactory("BadgeRoles", {
      libraries: {
        PermissionsDelay: permissions.address,
      },
    });

    const masterCopy = await Modifier.deploy(
      FirstAddress,
      FirstAddress,
      FirstAddress,
      badger.address
    );

    return { factory, masterCopy, Modifier, badger };
  });

  it("should throw because master copy is already initialized", async () => {
    const { masterCopy, badger } = await baseSetup();
    const encodedParams = new AbiCoder().encode(paramsTypes, [
      AddressOne,
      AddressOne,
      AddressOne,
      badger.address,
    ]);

    await expect(masterCopy.setUp(encodedParams)).to.be.revertedWith(
      "Initializable: contract is already initialized"
    );
  });

  it("should deploy new roles module proxy", async () => {
    const { factory, masterCopy, Modifier, badger } = await baseSetup();
    const [avatar, owner, target] = await ethers.getSigners();
    const paramsValues = [
      owner.address,
      avatar.address,
      target.address,
      badger.address,
    ];
    const encodedParams = [new AbiCoder().encode(paramsTypes, paramsValues)];
    const initParams = masterCopy.interface.encodeFunctionData(
      "setUp",
      encodedParams
    );
    const receipt = await factory
      .deployModule(masterCopy.address, initParams, saltNonce)
      .then((tx: any) => tx.wait());

    // retrieve new address from event
    const {
      args: [newProxyAddress],
    } = receipt.events.find(
      ({ event }: { event: string }) => event === "ModuleProxyCreation"
    );

    const newProxy = Modifier.attach(newProxyAddress);
    // const newProxy = await hre.ethers.getContractAt("Roles", newProxyAddress);
    expect(await newProxy.avatar()).to.be.eq(avatar.address);
    expect(await newProxy.target()).to.be.eq(target.address);
  });
});
