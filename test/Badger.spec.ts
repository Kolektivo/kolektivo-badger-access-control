import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { Contract } from "ethers";
import { ethers, deployments } from "hardhat";

const baseUri = "ipfs://";

const setupTest = deployments.createFixture(async ({ deployments, ethers }) => {
  await deployments.fixture();
  const badgerFactory = await ethers.getContractFactory("Badger");
  const badgerInstance = await badgerFactory.deploy(baseUri);
  await badgerInstance.deployed();

  return await badgerInstance.deployed();
});

describe("Badger", function () {
  const amount = 2;
  const initalTokenId = 1;
  const secondTokenId = initalTokenId + 1;

  let badgerInstance: Contract,
    owner: SignerWithAddress,
    alice: SignerWithAddress,
    bob: SignerWithAddress;

  before("get signers", async () => {
    [owner, alice, bob] = await ethers.getSigners();
  });

  beforeEach(async () => {
    badgerInstance = await setupTest();
  });

  /*
    minting and burning
  */

  describe("#mint", () => {
    it("mints the correct token amount to the recipient", async function () {
      await badgerInstance.mint(alice.address, initalTokenId, amount);

      const tokenAmount = await badgerInstance.balanceOf(
        alice.address,
        initalTokenId
      );

      expect(tokenAmount).to.equal(amount);
    });

    context("when called by non-contract-owner", () => {
      it("reverts 'Ownable: caller is not the owner", async function () {
        await expect(
          badgerInstance.connect(alice).mint(alice.address, 1, amount)
        ).to.be.revertedWith("Ownable: caller is not the owner");
      });
    });
  });

  describe("#burn", () => {
    context("when called by non-contract-owner", () => {
      it("reverts 'Ownable: caller is not the owner'", async function () {
        await expect(
          badgerInstance.connect(alice).burn(alice.address, 1, amount)
        ).to.be.revertedWith("Ownable: caller is not the owner");
      });
    });

    it("burns one token from alice", async () => {
      await badgerInstance.mint(alice.address, initalTokenId, amount);

      const burnAmount = 1;
      await badgerInstance.burn(alice.address, initalTokenId, burnAmount);

      expect(
        await badgerInstance.balanceOf(alice.address, initalTokenId)
      ).to.equal(amount - burnAmount);
    });
  });

  describe("#mintToMultiple", () => {
    const amounts = [10, 20];
    const secondTokenId = initalTokenId + 1;
    const tokenIds = [initalTokenId, secondTokenId];

    let addresses: string[];

    beforeEach("get addresses", async () => {
      addresses = [alice.address, bob.address];
    });

    context("with valid inputs and access rights", () => {
      beforeEach("mint a batch of token to diff addresses", async () => {
        await badgerInstance.mintToMultiple(addresses, tokenIds, amounts);
      });

      it("mints correct amount of tokens to alice", async () => {
        const aliceBalance = await badgerInstance.balanceOf(
          alice.address,
          initalTokenId
        );
        expect(aliceBalance).to.equal(amounts[0]);
      });

      it("mints correct amount of tokens to bob", async () => {
        const bobBalance = await badgerInstance.balanceOf(
          bob.address,
          secondTokenId
        );
        expect(bobBalance).to.equal(amounts[1]);
      });
    });

    context("with invalid input arrays", () => {
      const tooManyAmounts = [...amounts, 420];

      it("reverts 'Input array mismatch'", async () => {
        expect(
          badgerInstance.mintToMultiple(addresses, tokenIds, tooManyAmounts)
        ).to.be.revertedWith("Input array mismatch");
      });
    });

    context("when called by non-contract-owner", () => {
      it("reverts 'Input array mismatch'", async () => {
        expect(
          badgerInstance
            .connect(alice)
            .mintToMultiple(addresses, tokenIds, amounts)
        ).to.be.revertedWith("Ownable: caller is not the owner");
      });
    });
  });

  describe("#burnFromMultiple", () => {
    const burnAmounts = [2, 4];
    const amounts = [10, 20];
    const secondTokenId = initalTokenId + 1;
    const tokenIds = [initalTokenId, secondTokenId];

    let addresses: string[];

    beforeEach("get addresses", async () => {
      addresses = [alice.address, bob.address];
    });

    context("with valid inputs and access rights", () => {
      beforeEach("mint a batch of token to diff addresses", async () => {
        await badgerInstance.mintToMultiple(addresses, tokenIds, amounts);
      });

      beforeEach("burn tokens", async () => {
        await badgerInstance.burnFromMultiple(addresses, tokenIds, burnAmounts);
      });

      it("burns correct amount of tokens from alice", async () => {
        const aliceBalance = await badgerInstance.balanceOf(
          alice.address,
          initalTokenId
        );
        expect(aliceBalance).to.equal(amounts[0] - burnAmounts[0]);
      });

      it("burns correct amount of tokens from bob", async () => {
        const bobBalance = await badgerInstance.balanceOf(
          bob.address,
          secondTokenId
        );
        expect(bobBalance).to.equal(amounts[1] - burnAmounts[1]);
      });
    });

    context("with invalid inputs", () => {
      it("reverts 'Input array mismatch'", async () => {
        expect(
          badgerInstance.burnFromMultiple(
            addresses,
            tokenIds,
            burnAmounts.slice(0, burnAmounts.length - 1)
          )
        ).to.be.revertedWith("Input array mismatch");
      });
    });

    context("when called by non-contract-owner", () => {
      it("reverts 'Ownable: caller is not the owner'", async () => {
        expect(
          badgerInstance
            .connect(alice)
            .burnFromMultiple(addresses, tokenIds, burnAmounts)
        ).to.be.revertedWith("Ownable: caller is not the owner");
      });
    });
  });

  describe("#safeTransferFrom", () => {
    beforeEach("mint", async () => {
      await badgerInstance.mint(alice.address, initalTokenId, amount);
    });

    context("when called by owner of the token", () => {
      it("reverts 'Transfer disabled for this tokenId'", () => {
        expect(
          badgerInstance
            .connect(alice)
            .safeTransferFrom(
              alice.address,
              bob.address,
              initalTokenId,
              amount,
              "0x00"
            )
        ).to.be.revertedWith("TransferDisabled()");
      });
    });
  });

  describe("#safeBatchTransferFrom", () => {
    beforeEach("create token tier & mint", async () => {
      await badgerInstance.mint(alice.address, initalTokenId, amount);
    });

    it("reverts 'Transfer disabled for this tier'", async () => {
      await expect(
        badgerInstance
          .connect(alice)
          .safeBatchTransferFrom(
            alice.address,
            bob.address,
            [initalTokenId, secondTokenId],
            [amount, amount],
            "0x00"
          )
      ).to.be.revertedWith("TransferDisabled()");
    });
  });

  describe("#setApprovalForAll", () => {
    beforeEach("mint token", async () => {
      await badgerInstance.mint(alice.address, initalTokenId, amount);
    });

    it("reverts 'Transfer disabled for this tier'", async () => {
      await expect(
        badgerInstance.connect(alice).setApprovalForAll(bob.address, true)
      ).to.be.revertedWith("TransferDisabled()");
    });
  });

  describe("#setUri", () => {
    it("throws if not owner", async () => {
      await expect(
        badgerInstance.connect(alice).setUri(initalTokenId, "")
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("updates the uri", async () => {
      const uri = "420";
      await badgerInstance.setUri(initalTokenId, uri);

      expect(await badgerInstance.uri(initalTokenId)).to.equal(baseUri + uri);
    });
  });

  describe.only("#setBaseUri", () => {
    it("throws if not owner", async () => {
      await expect(
        badgerInstance.connect(alice).setBaseUri("")
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("updates the base uri", async () => {
      const newBase = "abc";
      await badgerInstance.setBaseUri(newBase);

      expect(await badgerInstance.uri(initalTokenId)).to.equal(newBase);
    });
  });
});
