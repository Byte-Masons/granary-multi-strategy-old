const hre = require('hardhat');
const {expect} = require('chai');

const moveTimeForward = async (seconds) => {
  await network.provider.send('evm_increaseTime', [seconds]);
  await network.provider.send('evm_mine');
};

// use with small values in case harvest is block-dependent instead of time-dependent
const moveBlocksForward = async (blocks) => {
  for (let i = 0; i < blocks; i++) {
    await network.provider.send('evm_increaseTime', [1]);
    await network.provider.send('evm_mine');
  }
};

const toWantUnit = (num, decimals) => {
  if (decimals) {
    return ethers.BigNumber.from(num * 10 ** decimals);
  }
  return ethers.utils.parseEther(num);
};

describe('Vaults', function () {
  let Vault;
  let vault;

  let Strategy;
  let strategy;

  let Want;
  let want;
  let wftm;
  let dai;
  let oath;
  let stader;

  const treasuryAddr = '0x0e7c5313E9BB80b654734d9b7aB1FB01468deE3b';
  const paymentSplitterAddress = '0x63cbd4134c2253041F370472c130e92daE4Ff174';

  const superAdminAddress = '0x04C710a1E8a738CDf7cAD3a52Ba77A784C35d8CE';
  const adminAddress = '0x539eF36C804e4D735d8cAb69e8e441c12d4B88E0';
  const guardianAddress = '0xf20E25f2AB644C8ecBFc992a6829478a85A98F2c';
  const maintainerAddress = '0x81876677843D00a7D792E1617459aC2E93202576';
  const wftmAddress = '0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83';
  const daiAddress = '0x8D11eC38a3EB5E956B052f67Da8Bdc9bef8Abf3E';
  const wantAddress = wftmAddress;
  const gWant = '0x98d5105370191D641f32589B35cDa9eCd367C74F';
  const variableDebtWant = '0x0f7f11AA3C42aaa5e653EbEd07220B4392a976A4';
  const targetLtv = 5000;

  const wantHolderAddr = '0x3E923747cA2675E096d812c3b24846aC39aeD645';
  const strategistAddr = '0x1A20D7A31e5B3Bc5f02c8A146EF6f394502a10c4';
  const strategists = [strategistAddr];
  const multisigRoles = [superAdminAddress, adminAddress, guardianAddress];
  const keepers = [
    '0x33D6cB7E91C62Dd6980F16D61e0cfae082CaBFCA',
    '0x34Df14D42988e4Dc622e37dc318e70429336B6c5',
    '0x36a63324edFc157bE22CF63A6Bf1C3B49a0E72C0',
    '0x51263D56ec81B5e823e34d7665A1F505C327b014',
    '0x5241F63D0C1f2970c45234a0F5b345036117E3C2',
    '0x5318250BD0b44D1740f47a5b6BE4F7fD5042682D',
    '0x55a078AFC2e20C8c20d1aa4420710d827Ee494d4',
    '0x73C882796Ea481fe0A2B8DE499d95e60ff971663',
    '0x7B540a4D24C906E5fB3d3EcD0Bb7B1aEd3823897',
    '0x8456a746e09A18F9187E5babEe6C60211CA728D1',
    '0x87A5AfC8cdDa71B5054C698366E97DB2F3C2BC2f',
    '0x9a2AdcbFb972e0EC2946A342f46895702930064F',
    '0xd21e0fe4ba0379ec8df6263795c8120414acd0a3',
    '0xe0268Aa6d55FfE1AA7A77587e56784e5b29004A2',
    '0xf58d534290Ce9fc4Ea639B8b9eE238Fe83d2efA6',
    '0xCcb4f4B05739b6C62D9663a5fA7f1E2693048019',
  ];

  const rewarderOwnerAddr = '0x33e7CCf4cc3ffC6c53221900D21a3c56422D0E0A';
  const oathHolderAddr = '0xeFB7895B2e38eBa4243002DDD2b76965193F13F9';
  const staderHolderAddr = '0x0459287c18076e173320314D360f5500C79dd5Fe';
  const granaryRewarderAddr = '0x7780E1A8321BD58BBc76594Db494c7Bfe8e87040';

  const oathAddr = '0x21ada0d2ac28c3a5fa3cd2ee30882da8812279b6';
  const staderAddr = '0x412a13C109aC30f0dB80AD3Bd1DeFd5D0A6c0Ac6';
  const usdcAddr = '0x04068DA6C83AFCFA0e13ba15A6696662335D5B75';
  const grainAddr = '0x02838746d9e1413e07ee064fcbada57055417f21';

  const gasAmount = '2.0';

  let owner;
  let wantHolder;
  let strategist;
  let guardian;
  let maintainer;
  let admin;
  let superAdmin;
  let unassignedRole;
  let targetLTV = 5000;
  let allowedLTVDrift = 100;
  let granaryOwner;
  let oathHolder;
  let staderHolder;

  beforeEach(async function () {
    //reset network
    await network.provider.request({
      method: 'hardhat_reset',
      params: [
        {
          forking: {
            jsonRpcUrl: 'https://rpc.ftm.tools',
            blockNumber: 62521807,
          },
        },
      ],
    });

    //get signers
    [owner, unassignedRole] = await ethers.getSigners();
    await hre.network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [wantHolderAddr],
    });
    wantHolder = await ethers.provider.getSigner(wantHolderAddr);
    await hre.network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [strategistAddr],
    });
    strategist = await ethers.provider.getSigner(strategistAddr);
    await hre.network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [adminAddress],
    });
    admin = await ethers.provider.getSigner(adminAddress);
    await hre.network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [superAdminAddress],
    });
    superAdmin = await ethers.provider.getSigner(superAdminAddress);
    await hre.network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [guardianAddress],
    });
    guardian = await ethers.provider.getSigner(guardianAddress);
    await hre.network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [maintainerAddress],
    });
    maintainer = await ethers.provider.getSigner(maintainerAddress);
    await hre.network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [rewarderOwnerAddr],
    });
    granaryOwner = await ethers.provider.getSigner(rewarderOwnerAddr);
    await hre.network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [oathHolderAddr],
    });
    oathHolder = await ethers.provider.getSigner(oathHolderAddr);
    await hre.network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [staderHolderAddr],
    });
    staderHolder = await ethers.provider.getSigner(staderHolderAddr);

    //get artifacts
    Vault = await ethers.getContractFactory('ReaperVaultERC4626');
    Strategy = await ethers.getContractFactory('ReaperStrategyGranaryV2');
    Want = await ethers.getContractFactory('@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20');

    //deploy contracts
    vault = await Vault.deploy(
      wantAddress,
      'WFTM Crypt',
      'rf-WFTM',
      ethers.constants.MaxUint256,
      treasuryAddr,
      [strategistAddr],
      [superAdminAddress, maintainerAddress, guardianAddress],
    );

    strategy = await hre.upgrades.deployProxy(
      Strategy,
      [
        vault.address,
        strategists,
        multisigRoles,
        keepers,
        gWant,
        targetLtv,
        targetLtv + 100,
      ],
      {kind: 'uups'},
    );
    await strategy.deployed();
    await vault.addStrategy(strategy.address, 500, 9000);
    want = await Want.attach(wantAddress);
    wftm = await Want.attach(wftmAddress);
    dai = await Want.attach(daiAddress);
    oath = await Want.attach(oathAddr);
    stader = await Want.attach(staderAddr);

    //approving LP token and vault share spend
    await want.connect(wantHolder).approve(vault.address, ethers.constants.MaxUint256);
    await want.connect(owner).approve(vault.address, ethers.constants.MaxUint256);
    await want.connect(wantHolder).transfer(owner.address, toWantUnit('100'));

    const blockStartTimestamp = 1657805485;
    const hour = 3600;
    const day = 24 * hour;
    const week = 7 * day;
    const distributionEnd = blockStartTimestamp + week;

    await owner.sendTransaction({
      to: rewarderOwnerAddr,
      value: ethers.utils.parseEther('1'), // Sends exactly 1.0 ether
    });
    
    const VELODROME = 0;
    const BEETHOVEN = 1;
    const UNIV3 = 2;
    const UNIV2 = 3;

    const step1 = {
      dex: BEETHOVEN,
      start: grainAddr,
      end: wantAddress
    }
    
    await strategy.setHarvestSteps([step1]);
    const oatsAndGrainsBalPoolId = "0x21bbfc5681d9e171677dbd1a85a9ab15df82ad86000100000000000000000708";
    await strategy.updateBalSwapPoolID(grainAddr, wantAddress, oatsAndGrainsBalPoolId);
  });

  describe('Deploying the vault and strategy', function () {
    it('should initiate vault with a 0 balance', async function () {
      const assets = ethers.utils.parseEther('1');
      const totalBalance = await vault.totalAssets();
      const pricePerFullShare = await vault.convertToAssets(assets);
      expect(totalBalance).to.equal(0);
      expect(pricePerFullShare).to.equal(assets);
    });
  });

  describe('Strategy Access control tests', function () {
    it('unassignedRole has no privileges', async function () {
      await expect(strategy.connect(unassignedRole).setEmergencyExit()).to.be.reverted;
    });

    it('strategist has right privileges', async function () {
      await expect(strategy.connect(strategist).setEmergencyExit()).to.be.reverted;
    });

    it('guardian has right privileges', async function () {
      const tx = await strategist.sendTransaction({
        to: guardianAddress,
        value: ethers.utils.parseEther(gasAmount),
      });
      await tx.wait();

      await expect(strategy.connect(guardian).setEmergencyExit()).to.not.be.reverted;
    });

    it('admin has right privileges', async function () {
      const tx = await strategist.sendTransaction({
        to: adminAddress,
        value: ethers.utils.parseEther(gasAmount),
      });
      await tx.wait();

      await expect(strategy.connect(admin).setEmergencyExit()).to.not.be.reverted;
    });

    it('super-admin/owner has right privileges', async function () {
      const tx = await strategist.sendTransaction({
        to: superAdminAddress,
        value: ethers.utils.parseEther(gasAmount),
      });
      await tx.wait();

      await expect(strategy.connect(superAdmin).setEmergencyExit()).to.not.be.reverted;
    });
  });

  describe('Vault Access control tests', function () {
    it('unassignedRole has no privileges', async function () {
      await expect(vault.connect(unassignedRole).addStrategy(strategy.address, 1000, 1000)).to.be.reverted;

      await expect(vault.connect(unassignedRole).updateStrategyAllocBPS(strategy.address, 1000)).to.be.reverted;

      await expect(vault.connect(unassignedRole).revokeStrategy(strategy.address)).to.be.reverted;

      await expect(vault.connect(unassignedRole).setEmergencyShutdown(true)).to.be.reverted;
    });

    it('guardian has right privileges', async function () {
      const tx = await owner.sendTransaction({
        to: guardianAddress,
        value: ethers.utils.parseEther('10'),
      });
      await tx.wait();

      await expect(vault.connect(guardian).addStrategy(strategy.address, 1000, 10000)).to.be.reverted;

      await expect(vault.connect(guardian).updateStrategyAllocBPS(strategy.address, 1000)).to.not.be.reverted;

      await expect(vault.connect(guardian).revokeStrategy(strategy.address)).to.not.be.reverted;

      await expect(vault.connect(guardian).setEmergencyShutdown(true)).to.not.be.reverted;

      await expect(vault.connect(guardian).setEmergencyShutdown(false)).to.be.reverted;

      await expect(vault.connect(guardian).removeTvlCap()).to.be.reverted;
    });

    it('strategist has right privileges', async function () {
      await expect(vault.connect(strategist).addStrategy(strategy.address, 1000, 10000)).to.be.reverted;

      await expect(vault.connect(strategist).updateStrategyAllocBPS(strategy.address, 1000)).to.not.be.reverted;

      await expect(vault.connect(strategist).revokeStrategy(strategy.address)).to.be.reverted;

      await expect(vault.connect(strategist).setEmergencyShutdown(true)).to.be.reverted;
    });

    it('superAdmin has right privileges', async function () {
      await owner.sendTransaction({
        to: superAdminAddress,
        value: ethers.utils.parseEther('10'),
      });
      const Strategy = await ethers.getContractFactory('ReaperStrategyGranaryV2');
        const strategy = await hre.upgrades.deployProxy(
          Strategy,
          [
            vault.address,
            strategists,
            multisigRoles,
            keepers,
            gWant,
            targetLtv,
            targetLtv + 100,
          ],
          {kind: 'uups'},
        );
      await strategy.deployed();
      await expect(vault.connect(superAdmin).addStrategy(strategy.address, 1000, 1000)).to.not.be.reverted;
      
      await expect(vault.connect(superAdmin).updateStrategyAllocBPS(strategy.address, 1000)).to.not.be.reverted;

      await expect(vault.connect(superAdmin).revokeStrategy(strategy.address)).to.not.be.reverted;

      await expect(vault.connect(superAdmin).setEmergencyShutdown(true)).to.not.be.reverted;
    });
  });

  describe('Vault Tests', function () {
    it('should allow deposits and account for them correctly', async function () {
      const userBalance = await want.balanceOf(wantHolderAddr);
      const vaultBalance = await vault.totalAssets();
      const depositAmount = toWantUnit('10');
      await vault.connect(wantHolder)['deposit(uint256)'](depositAmount);
      
      await strategy.harvest();

      const newVaultBalance = await vault.totalAssets();
      const newUserBalance = await want.balanceOf(wantHolderAddr);
      const allowedInaccuracy = depositAmount.div(200);
      expect(depositAmount).to.be.closeTo(newVaultBalance, allowedInaccuracy);
    });

    it('should mint user their pool share', async function () {
      const depositAmount = toWantUnit('10');
      await vault.connect(wantHolder)['deposit(uint256)'](depositAmount);
      await strategy.harvest();

      const ownerDepositAmount = toWantUnit('0.1');
      await want.connect(wantHolder).transfer(owner.address, ownerDepositAmount);
      await want.connect(owner).approve(vault.address, ethers.constants.MaxUint256);
      await vault.connect(owner)['deposit(uint256)'](ownerDepositAmount);

      const allowedImprecision = toWantUnit('0.0001');

      const userVaultBalance = await vault.balanceOf(wantHolderAddr);
      expect(userVaultBalance).to.be.closeTo(depositAmount, allowedImprecision);
      const ownerVaultBalance = await vault.balanceOf(owner.address);
      expect(ownerVaultBalance).to.be.closeTo(ownerDepositAmount, allowedImprecision);

      const ownerWantBalancePreWithdraw = await want.balanceOf(owner.address);
      await vault.connect(owner).withdrawAll();
      const ownerWantWithdrawn = (await want.balanceOf(owner.address)).sub(ownerWantBalancePreWithdraw);
      expect(ownerWantWithdrawn).to.be.closeTo(ownerDepositAmount, allowedImprecision);
      const afterOwnerVaultBalance = await vault.balanceOf(owner.address);
      expect(afterOwnerVaultBalance).to.equal(0);
    });

    it('should allow withdrawals', async function () {
      const userBalance = await want.balanceOf(wantHolderAddr);
      const depositAmount = toWantUnit('100');
      await vault.connect(wantHolder)['deposit(uint256)'](depositAmount);
      await strategy.harvest();
      await moveTimeForward(3600);
      await strategy.harvest();

      await vault.connect(wantHolder).withdrawAll();
      const newUserVaultBalance = await vault.balanceOf(wantHolderAddr);
      const userBalanceAfterWithdraw = await want.balanceOf(wantHolderAddr);

      const expectedBalance = userBalance;
      const smallDifference = depositAmount.div(200);
      const isSmallBalanceDifference = expectedBalance.sub(userBalanceAfterWithdraw).lt(smallDifference);
      console.log(`expectedBalance: ${expectedBalance}`);
      console.log(`userBalanceAfterWithdraw: ${userBalanceAfterWithdraw}`);
      console.log(`expectedBalance.sub(userBalanceAfterWithdraw): ${expectedBalance.sub(userBalanceAfterWithdraw)}`);
      console.log(`smallDifference: ${smallDifference}`);
      expect(isSmallBalanceDifference).to.equal(true);
    });

    it('should allow small withdrawal', async function () {
      const userBalance = await want.balanceOf(wantHolderAddr);
      const depositAmount = toWantUnit('0.0000001');
      await vault.connect(wantHolder)['deposit(uint256)'](depositAmount);
      await strategy.harvest();

      const ownerDepositAmount = toWantUnit('0.1');
      await want.connect(wantHolder).transfer(owner.address, ownerDepositAmount);
      await want.connect(owner).approve(vault.address, ethers.constants.MaxUint256);
      await vault.connect(owner)['deposit(uint256)'](ownerDepositAmount);

      await vault.connect(wantHolder).withdrawAll();
      const newUserVaultBalance = await vault.balanceOf(wantHolderAddr);
      const userBalanceAfterWithdraw = await want.balanceOf(wantHolderAddr);

      const expectedBalance = userBalance.sub(ownerDepositAmount);
      const smallDifference = depositAmount.div(200);
      const isSmallBalanceDifference = expectedBalance.sub(userBalanceAfterWithdraw).lt(smallDifference);
      console.log(`expectedBalance: ${expectedBalance}`);
      console.log(`userBalanceAfterWithdraw: ${userBalanceAfterWithdraw}`);
      console.log(`expectedBalance.sub(userBalanceAfterWithdraw): ${expectedBalance.sub(userBalanceAfterWithdraw)}`);
      console.log(`smallDifference: ${smallDifference}`);
      expect(isSmallBalanceDifference).to.equal(true);
    });

    it('should handle small deposit + redeem', async function () {
      const userBalance = await want.balanceOf(wantHolderAddr);
      const depositAmount = toWantUnit('0.000001');
      await vault.connect(wantHolder)['deposit(uint256)'](depositAmount);
      await strategy.harvest();

      const ownerDepositAmount = toWantUnit('0.1');
      await want.connect(wantHolder).transfer(owner.address, ownerDepositAmount);
      await want.connect(owner).approve(vault.address, ethers.constants.MaxUint256);
      await vault.connect(owner)['deposit(uint256)'](ownerDepositAmount);

      await vault.connect(wantHolder).redeem(depositAmount, wantHolderAddr, wantHolderAddr);
      const newUserVaultBalance = await vault.balanceOf(wantHolderAddr);
      const userBalanceAfterWithdraw = await want.balanceOf(wantHolderAddr);

      const expectedBalance = userBalance.sub(ownerDepositAmount);
      const smallDifference = depositAmount.div(200);
      const isSmallBalanceDifference = expectedBalance.sub(userBalanceAfterWithdraw).lt(smallDifference);
      console.log(`expectedBalance: ${expectedBalance}`);
      console.log(`userBalanceAfterWithdraw: ${userBalanceAfterWithdraw}`);
      console.log(`expectedBalance.sub(userBalanceAfterWithdraw): ${expectedBalance.sub(userBalanceAfterWithdraw)}`);
      console.log(`smallDifference: ${smallDifference}`);
      expect(isSmallBalanceDifference).to.equal(true);
    });

    it('should be able to convert assets in to amount of shares', async function () {
      const depositAmount = toWantUnit('100');
      await vault.connect(wantHolder)['deposit(uint256)'](depositAmount);

      let totalAssets = await vault.totalAssets();
      console.log(`totalAssets: ${totalAssets}`);
      // Modify the price per share to not be 1 to 1
      await want.connect(wantHolder).transfer(vault.address, toWantUnit('1337'));
      totalAssets = await vault.totalAssets();
      console.log(`totalAssets: ${totalAssets}`);

      await want.connect(wantHolder).transfer(owner.address, depositAmount);
      await want.connect(owner).approve(vault.address, ethers.constants.MaxUint256);
      const shares = await vault.connect(owner).convertToShares(depositAmount);
      await vault.connect(owner)['deposit(uint256)'](depositAmount);
      console.log(`shares: ${shares}`);

      const vaultBalance = await vault.balanceOf(owner.address);
      console.log(`vaultBalance: ${vaultBalance}`);
      expect(shares).to.equal(vaultBalance);
    });

    it('should be able to convert shares in to amount of assets', async function () {
      const shareAmount = toWantUnit('10');
      let assets = await vault.convertToAssets(shareAmount);
      expect(assets).to.equal(shareAmount);
      console.log(`assets: ${assets}`);

      const depositAmount = toWantUnit('17');
      await vault.connect(wantHolder)['deposit(uint256,address)'](depositAmount, wantHolderAddr);
      await vault.injectTokens(depositAmount);

      assets = await vault.convertToAssets(shareAmount);
      console.log(`assets: ${assets}`);
      expect(assets).to.equal(shareAmount.mul(2));
    });

    it('maxDeposit returns the maximum amount that can be deposited', async function () {
      let tvlCap = toWantUnit('50');
      await vault.updateTvlCap(tvlCap);
      let maxDeposit = await vault.maxDeposit(wantHolderAddr);
      expect(maxDeposit).to.equal(tvlCap);

      const depositAmount = toWantUnit('25');
      await vault.connect(wantHolder)['deposit(uint256)'](depositAmount);
      maxDeposit = await vault.maxDeposit(wantHolderAddr);
      expect(maxDeposit).to.equal(tvlCap.sub(depositAmount));

      await vault.connect(wantHolder)['deposit(uint256)'](depositAmount);
      maxDeposit = await vault.maxDeposit(wantHolderAddr);
      expect(maxDeposit).to.equal(0);

      tvlCap = toWantUnit('10');
      await vault.updateTvlCap(tvlCap);
      maxDeposit = await vault.maxDeposit(wantHolderAddr);
      expect(maxDeposit).to.equal(0);
    });

    it('can previewDeposit', async function () {
      let depositAmount = toWantUnit('137');
      await vault.connect(wantHolder)['deposit(uint256,address)'](depositAmount, wantHolderAddr);

      depositAmount = toWantUnit('44');
      let depositPreview = await vault.connect(wantHolder).previewDeposit(depositAmount);
      let vaultBalance = await vault.balanceOf(wantHolderAddr);
      await vault.connect(wantHolder)['deposit(uint256,address)'](depositAmount, wantHolderAddr);
      let vaultBalanceAfter = await vault.balanceOf(wantHolderAddr);
      let balanceIncrease = vaultBalanceAfter.sub(vaultBalance);
      expect(depositPreview).to.equal(balanceIncrease);

      await want.connect(wantHolder).transfer(vault.address, toWantUnit('11346'));

      depositAmount = toWantUnit('130');
      depositPreview = await vault.connect(wantHolder).previewDeposit(depositAmount);
      vaultBalance = await vault.balanceOf(wantHolderAddr);
      await vault.connect(wantHolder)['deposit(uint256,address)'](depositAmount, wantHolderAddr);
      vaultBalanceAfter = await vault.balanceOf(wantHolderAddr);
      balanceIncrease = vaultBalanceAfter.sub(vaultBalance);
      expect(depositPreview).to.equal(balanceIncrease);
    });

    it('maxMint returns the max amount of shares that can be minted', async function () {
      let maxMint = await vault.connect(wantHolder).maxMint(ethers.constants.AddressZero);
      expect(maxMint).to.equal(ethers.constants.MaxUint256);

      let tvlCap = toWantUnit('50');
      await vault.updateTvlCap(tvlCap);
      maxMint = await vault.connect(wantHolder).maxMint(ethers.constants.AddressZero);
      expect(maxMint).to.equal(tvlCap);

      let depositAmount = toWantUnit('35');
      await vault.connect(wantHolder)['deposit(uint256,address)'](depositAmount, wantHolderAddr);
      maxMint = await vault.connect(wantHolder).maxMint(ethers.constants.AddressZero);
      expect(maxMint).to.equal(tvlCap.sub(depositAmount));

      // Change the price per share
      const transferAmount = toWantUnit('46');
      await vault.injectTokens(transferAmount);
      depositAmount = toWantUnit('15');
      await vault.updateTvlCap(tvlCap.add(transferAmount).add(depositAmount));
      const depositPreview = await vault.connect(wantHolder).previewDeposit(depositAmount);
      await vault.connect(wantHolder)['deposit(uint256,address)'](depositAmount, wantHolderAddr);
      maxMint = await vault.connect(wantHolder).maxMint(ethers.constants.AddressZero);
      expect(maxMint).to.equal(depositPreview);
    });

    it('previewMint returns the amount of asset taken on a mint', async function () {
      let mintAmount = toWantUnit('55');
      let mintPreview = await vault.connect(wantHolder).previewMint(mintAmount);
      expect(mintPreview).to.equal(mintAmount);

      let userBalance = await want.balanceOf(wantHolderAddr);
      await vault.connect(wantHolder).mint(mintAmount, wantHolderAddr);
      let userBalanceAfterMint = await want.balanceOf(wantHolderAddr);
      expect(userBalanceAfterMint).to.equal(userBalance.sub(mintPreview));

      // Change the price per share
      const transferAmount = toWantUnit('11346');
      await want.connect(wantHolder).transfer(vault.address, transferAmount);

      mintAmount = toWantUnit('13');
      mintPreview = await vault.connect(wantHolder).previewMint(mintAmount);
      userBalance = await want.balanceOf(wantHolderAddr);
      await vault.connect(wantHolder).mint(mintAmount, wantHolderAddr);
      userBalanceAfterMint = await want.balanceOf(wantHolderAddr);
      expect(userBalanceAfterMint).to.equal(userBalance.sub(mintPreview));
    });

    it('mint creates the correct amount of shares', async function () {
      let mintAmount = toWantUnit('55');
      let userBalance = await want.balanceOf(wantHolderAddr);
      // let shareBalance = await vault.balanceOf(wantHolderAddr);
      await vault.connect(wantHolder).mint(mintAmount, wantHolderAddr);
      let shareBalanceAfterMint = await vault.balanceOf(wantHolderAddr);
      let userBalanceAfterMint = await want.balanceOf(wantHolderAddr);
      expect(userBalanceAfterMint).to.equal(userBalance.sub(mintAmount));
      expect(shareBalanceAfterMint).to.equal(mintAmount);

      // Change the price per share
      const transferAmount = toWantUnit('11346');
      await want.connect(wantHolder).transfer(vault.address, transferAmount);

      // Ensure it mints expected amount of shares with different price per share
      mintAmount = toWantUnit('11');
      let shareBalance = await vault.balanceOf(wantHolderAddr);
      await vault.connect(wantHolder).mint(mintAmount, wantHolderAddr);
      shareBalanceAfterMint = await vault.balanceOf(wantHolderAddr);
      expect(shareBalanceAfterMint).to.equal(shareBalance.add(mintAmount));

      // Ensure deposit and mint are equivalent
      const depositAmount = toWantUnit('56');
      shareBalance = await vault.balanceOf(wantHolderAddr);
      await vault.connect(wantHolder)['deposit(uint256,address)'](depositAmount, wantHolderAddr);
      const shareBalanceAfterDeposit = await vault.balanceOf(wantHolderAddr);
      const depositShareIncrease = shareBalanceAfterDeposit.sub(shareBalance);
      userBalance = await want.balanceOf(wantHolderAddr);
      await vault.connect(wantHolder).mint(depositShareIncrease, wantHolderAddr);
      userBalanceAfterMint = await want.balanceOf(wantHolderAddr);
      const mintedAssets = userBalance.sub(userBalanceAfterMint);
      const allowedInaccuracy = 10;
      expect(depositAmount).to.be.closeTo(mintedAssets, allowedInaccuracy);
    });

    it('previewWithdraw returns the correct amount of shares', async function () {
      let withdrawAmount = toWantUnit('7');
      let burnedSharesPreview = await vault.previewWithdraw(withdrawAmount);
      expect(burnedSharesPreview).to.equal(0);
      const depositAmount = toWantUnit('56');
      await vault.connect(wantHolder)['deposit(uint256,address)'](depositAmount, wantHolderAddr);
      burnedSharesPreview = await vault.previewWithdraw(withdrawAmount);
      expect(burnedSharesPreview).to.equal(withdrawAmount);
      withdrawAmount = toWantUnit('0');
      burnedSharesPreview = await vault.previewWithdraw(withdrawAmount);
      expect(burnedSharesPreview).to.equal(withdrawAmount);
      // // Change the price per share
      const transferAmount = toWantUnit('35782');
      await want.connect(wantHolder).transfer(vault.address, transferAmount);
      withdrawAmount = toWantUnit('33');
      burnedSharesPreview = await vault.previewWithdraw(withdrawAmount);
      const userVaultBalance = await vault.balanceOf(wantHolderAddr);
      await vault.connect(wantHolder)['withdraw(uint256,address,address)'](withdrawAmount, wantHolderAddr, wantHolderAddr);
      const userVaultBalanceAfter = await vault.balanceOf(wantHolderAddr);
      const burnedShares = userVaultBalance.sub(userVaultBalanceAfter);
      expect(burnedSharesPreview).to.equal(burnedShares);
    });

    it('previewRedeem returns the correct amount of assets', async function () {
      let redeemAmount = toWantUnit('7');
      let redeemedAssetsPreview = await vault.previewRedeem(redeemAmount);
      expect(redeemedAssetsPreview).to.equal(redeemAmount);
      const depositAmount = toWantUnit('56');
      await vault.connect(wantHolder)['deposit(uint256,address)'](depositAmount, wantHolderAddr);
      redeemedAssetsPreview = await vault.previewRedeem(redeemAmount);
      expect(redeemedAssetsPreview).to.equal(redeemAmount);
      redeemAmount = toWantUnit('0');
      redeemedAssetsPreview = await vault.previewRedeem(redeemAmount);
      expect(redeemedAssetsPreview).to.equal(redeemAmount);
      // // // Change the price per share
      const transferAmount = toWantUnit('35782');
      await want.connect(wantHolder).transfer(vault.address, transferAmount);
      redeemAmount = toWantUnit('33');
      redeemedAssetsPreview = await vault.previewRedeem(redeemAmount);
      const userVaultBalance = await want.balanceOf(wantHolderAddr);
      await vault.connect(wantHolder).redeem(redeemAmount, wantHolderAddr, wantHolderAddr);
      const userVaultBalanceAfter = await want.balanceOf(wantHolderAddr);
      const redeemedAssets = userVaultBalanceAfter.sub(userVaultBalance);
      expect(redeemedAssetsPreview).to.equal(redeemedAssets);
    });

    it('mint and redeem are inverse operations', async function () {
      let mintAmount = toWantUnit('34');
      let mintAssetsPreview = await vault.previewMint(mintAmount);
      let userBalance = await want.balanceOf(wantHolderAddr);
      await vault.connect(wantHolder).mint(mintAmount, wantHolderAddr);
      let userBalanceAfter = await want.balanceOf(wantHolderAddr);
      let mintedAssets = userBalance.sub(userBalanceAfter);
      let redeemAssetsPreview = await vault.previewRedeem(mintAmount);
      userBalance = await want.balanceOf(wantHolderAddr);
      await vault.connect(wantHolder).redeem(mintAmount, wantHolderAddr, wantHolderAddr);
      userBalanceAfter = await want.balanceOf(wantHolderAddr);
      let redeemedAssets = userBalanceAfter.sub(userBalance);
      // Assets:Shares are 1:1 so should be equal
      expect(mintAssetsPreview).to.equal(mintAmount);
      expect(mintedAssets).to.equal(mintAmount);
      expect(redeemAssetsPreview).to.equal(mintAmount);
      expect(redeemedAssets).to.equal(mintAmount);
      expect(mintedAssets).to.equal(redeemedAssets);

      await vault.connect(wantHolder).mint(mintAmount, wantHolderAddr);
      // Change the price per share
      const transferAmount = toWantUnit('35782');
      await want.connect(wantHolder).transfer(vault.address, transferAmount);

      mintAmount = toWantUnit('625');
      mintAssetsPreview = await vault.previewMint(mintAmount);
      userBalance = await want.balanceOf(wantHolderAddr);
      await vault.connect(wantHolder).mint(mintAmount, wantHolderAddr);
      userBalanceAfter = await want.balanceOf(wantHolderAddr);
      mintedAssets = userBalance.sub(userBalanceAfter);
      redeemAssetsPreview = await vault.previewRedeem(mintAmount);
      userBalance = await want.balanceOf(wantHolderAddr);
      await vault.connect(wantHolder).redeem(mintAmount, wantHolderAddr, wantHolderAddr);
      userBalanceAfter = await want.balanceOf(wantHolderAddr);
      redeemedAssets = userBalanceAfter.sub(userBalance);
      const allowedInaccuracy = 2;
      // Assets:Shares price are not 1:1, difference in rounding should be allowed
      expect(mintAssetsPreview).to.be.closeTo(mintedAssets, allowedInaccuracy);
      expect(redeemAssetsPreview).to.be.closeTo(redeemedAssets, allowedInaccuracy);
      expect(mintedAssets).to.be.closeTo(redeemedAssets, allowedInaccuracy);
    });

    it('should lock profits from harvests', async function () {
      const timeToSkip = 3600;
      const initialUserBalance = await want.balanceOf(wantHolderAddr);
      const depositAmount = initialUserBalance;

      await vault.connect(wantHolder)['deposit(uint256,address)'](depositAmount, wantHolderAddr);
      await strategy.harvest();
      let vaultBalance = await vault.totalAssets();
      let lockedProfit = await vault.lockedProfit();
      console.log(`vaultBalance ${vaultBalance}`);
      console.log(`lockedProfit ${lockedProfit}`);

      await moveTimeForward(timeToSkip);
      await strategy.harvest();

      vaultBalance = await vault.totalAssets();
      lockedProfit = await vault.lockedProfit();
      console.log(`vaultBalance ${vaultBalance}`);
      console.log(`lockedProfit ${lockedProfit}`);
      expect(lockedProfit).to.be.gt(0);

      let pricePerShare = await vault.previewRedeem(toWantUnit('1'));
      console.log(`pricePerShare ${pricePerShare}`);

      for (let index = 0; index < 5; index++) {
        await moveTimeForward(timeToSkip);
        let previousPricePerShare = pricePerShare;
        pricePerShare = await vault.previewRedeem(toWantUnit('1'));
        console.log(`pricePerShare ${pricePerShare}`);
        expect(pricePerShare).to.be.gt(previousPricePerShare);
      }

      await strategy.harvest();

      // Setting degradation to 1e18 will release all the profit in 1 block
      // so all the profit should be released
      await vault.setLockedProfitDegradation(toWantUnit('1'));
      await vault.connect(wantHolder).withdrawAll();
      vaultBalance = await vault.totalAssets();
      console.log(`vaultBalance: ${vaultBalance}`);
      // All the profit should have been unlocked to allow a redeem of all assets
      expect(vaultBalance).to.be.lt(depositAmount.div(10_000));
    });

    it('mint and deposit are equivalent', async function () {
      let mintAmount = toWantUnit('18');
      let mintBalanceBefore = await vault.balanceOf(wantHolderAddr);
      await vault.connect(wantHolder).mint(mintAmount, wantHolderAddr);
      let mintBalanceAfter = await vault.balanceOf(wantHolderAddr);
      let mintedShares = mintBalanceAfter.sub(mintBalanceBefore);
      console.log(`mintedShares: ${mintedShares}`);

      let depositAmount = toWantUnit('18');
      let depositBalanceBefore = await vault.balanceOf(wantHolderAddr);
      await vault.connect(wantHolder)['deposit(uint256,address)'](depositAmount, wantHolderAddr);
      let depositBalanceAfter = await vault.balanceOf(wantHolderAddr);
      let depositedShares = depositBalanceAfter.sub(depositBalanceBefore);
      console.log(`depositedShares: ${depositedShares}`);

      expect(mintedShares).to.equal(depositedShares);

      // Change the price per share
      const transferAmount = toWantUnit('35782');
      await want.connect(wantHolder).transfer(vault.address, transferAmount);

      mintBalanceBefore = await vault.balanceOf(wantHolderAddr);
      const userBalanceBefore = await want.balanceOf(wantHolderAddr);
      await vault.connect(wantHolder).mint(mintAmount, wantHolderAddr);
      const userBalanceAfter = await want.balanceOf(wantHolderAddr);
      mintBalanceAfter = await vault.balanceOf(wantHolderAddr);
      mintedShares = mintBalanceAfter.sub(mintBalanceBefore);
      console.log(`mintedShares: ${mintedShares}`);

      depositAmount = userBalanceBefore.sub(userBalanceAfter);
      depositBalanceBefore = await vault.balanceOf(wantHolderAddr);
      await vault.connect(wantHolder)['deposit(uint256,address)'](depositAmount, wantHolderAddr);
      depositBalanceAfter = await vault.balanceOf(wantHolderAddr);
      depositedShares = depositBalanceAfter.sub(depositBalanceBefore);
      console.log(`depositedShares: ${depositedShares}`);

      expect(mintedShares).to.equal(depositedShares);
    });
  });

  describe('Strategy', function () {
    it('should provide yield', async function () {
      const timeToSkip = 3600;
      const initialUserBalance = await want.balanceOf(wantHolderAddr);
      const depositAmount = initialUserBalance.div(1000);

      await vault.connect(wantHolder)['deposit(uint256)'](depositAmount);
      const initialVaultBalance = await vault.totalAssets();

      console.log(initialVaultBalance.toString());
      // await strategy.authorizedDelever(ethers.constants.MaxUint256);
      // await strategy.setLeverage(0, 1, true);

      await strategy.harvest();

      const numHarvests = 5;
      for (let i = 0; i < numHarvests; i++) {
        await moveTimeForward(timeToSkip);
        await strategy.harvest();
      }

      const finalVaultBalance = await vault.totalAssets();
      console.log(finalVaultBalance);
      const profit = finalVaultBalance.sub(initialVaultBalance);
      console.log(`profit: ${profit}`);
      expect(finalVaultBalance).to.be.gt(initialVaultBalance);
    });
    it('should allow deposits and account for them correctly', async function () {
      const userBalance = await want.balanceOf(wantHolderAddr);
      const vaultBalance = await vault.totalAssets();
      const depositAmount = toWantUnit('10');
      await vault.connect(wantHolder)['deposit(uint256)'](depositAmount);
      const newVaultBalance = await vault.totalAssets();
      const newUserBalance = await want.balanceOf(wantHolderAddr);

      const deductedAmount = userBalance.sub(newUserBalance);
      expect(deductedAmount).to.equal(depositAmount);
      const tx = await vault.connect(wantHolder)['deposit(uint256)'](depositAmount);
      const receipt = await tx.wait();
      console.log(`gas used ${receipt.gasUsed}`);
      expect(vaultBalance).to.equal(0);
      // // Compound mint reduces balance by a small amount
      // const smallDifference = depositAmount * 0.00000001; // For 1e18
      const smallDifference = depositAmount * 0.000001; // For USDC or want with smaller decimals allow bigger difference
      const isSmallBalanceDifference = depositAmount.sub(newVaultBalance) < smallDifference;
      expect(isSmallBalanceDifference).to.equal(true);

      ltv = await strategy.connect(wantHolder).calculateLTV();
      expect(ltv).to.equal(0);
      await strategy.harvest();
      ltv = await strategy.connect(wantHolder).calculateLTV();
      expect(ltv.toNumber()).to.be.closeTo(targetLTV, allowedLTVDrift);
    });

    it('should trigger deleveraging on deposit when LTV is too high', async function () {
      const depositAmount = toWantUnit('10000');
      await vault.connect(wantHolder)['deposit(uint256)'](depositAmount);
      await strategy.harvest();
      const ltvBefore = await strategy.connect(wantHolder).calculateLTV();
      expect(ltvBefore.toNumber()).to.be.closeTo(targetLTV, allowedLTVDrift);
      const newLTV = toWantUnit('0');
      await strategy.setLeverage(newLTV, newLTV+100, true);
      const smallDepositAmount = toWantUnit('1');
      await vault.connect(wantHolder)['deposit(uint256)'](depositAmount);
      await strategy.harvest();
      const ltvAfter = await strategy.connect(wantHolder).calculateLTV();
      expect(ltvAfter.toNumber()).to.be.closeTo(newLTV, allowedLTVDrift);
    });

    it('should not change leverage when LTV is within the allowed drift on deposit', async function () {
      const depositAmount = toWantUnit('10000');
      await vault.connect(wantHolder)['deposit(uint256)'](depositAmount);
      await strategy.harvest();
      const ltvBefore = await strategy.connect(wantHolder).calculateLTV();
      expect(ltvBefore.toNumber()).to.be.closeTo(targetLTV, allowedLTVDrift);
      const smallDepositAmount = toWantUnit('1');
      await vault.connect(wantHolder)['deposit(uint256)'](smallDepositAmount);
      await strategy.harvest();
      const ltvAfter = await strategy.connect(wantHolder).calculateLTV();
      expect(ltvAfter.toNumber()).to.be.closeTo(targetLTV, allowedLTVDrift);
    });

    it('should allow withdrawals', async function () {
      const userBalance = await want.balanceOf(wantHolderAddr);
      const depositAmount = toWantUnit('100');
      let tx = await vault.connect(wantHolder)['deposit(uint256)'](depositAmount);
      let receipt = await tx.wait();
      console.log(`deposit gas used ${receipt.gasUsed}`);
      console.log(`strategy balance ${await strategy.balanceOf()}`);
      let ltv = await strategy.calculateLTV();
      console.log(`LTV after deposit ${ltv.toString()}`);

      tx = await vault.connect(wantHolder).withdrawAll();
      receipt = await tx.wait();
      console.log(`withdraw gas used ${receipt.gasUsed}`);
      ltv = await strategy.calculateLTV();
      console.log(`strategy balance ${await strategy.balanceOf()}`);
      console.log(`LTV after withdraw ${ltv.toString()}`);
      const newUserVaultBalance = await vault.balanceOf(wantHolderAddr);
      const userBalanceAfterWithdraw = await want.balanceOf(wantHolderAddr);
      const expectedBalance = userBalance;
      const smallDifference = expectedBalance * 0.0000001;
      const isSmallBalanceDifference = expectedBalance.sub(userBalanceAfterWithdraw) < smallDifference;
      expect(isSmallBalanceDifference).to.equal(true);
    });

    it('should trigger leveraging on withdraw when LTV is too low', async function () {
      const startingLTV = 4000
      await strategy.setLeverage(startingLTV, startingLTV+100, true);
      const depositAmount = toWantUnit('10000');

      await vault.connect(wantHolder)['deposit(uint256)'](depositAmount);
      await strategy.harvest();
      const ltvBefore = await strategy.calculateLTV();
      expect(ltvBefore.toNumber()).to.be.closeTo(startingLTV, allowedLTVDrift);
      const newLTV = targetLTV;
      await strategy.setLeverage(newLTV, newLTV+100, true);
      const smallWithdrawAmount = toWantUnit('1');
      const userBalance = await want.balanceOf(wantHolderAddr);
      await vault.connect(wantHolder)['withdraw(uint256,address,address)'](smallWithdrawAmount, wantHolderAddr, wantHolderAddr);
      await strategy.harvest();
      const userBalanceAfterWithdraw = await want.balanceOf(wantHolderAddr);
      const ltvAfter = await strategy.calculateLTV();
      expect(ltvAfter.toNumber()).to.be.closeTo(newLTV, allowedLTVDrift);

      const expectedBalance = userBalance.add(smallWithdrawAmount);

      expect(userBalanceAfterWithdraw).to.be.closeTo(expectedBalance, toWantUnit('0.00001'));
    });

    it('should trigger deleveraging on withdraw when LTV is too high', async function () {
      const depositAmount = toWantUnit('10000');
      await vault.connect(wantHolder)['deposit(uint256)'](depositAmount);
      await strategy.harvest();
      const ltvBefore = await strategy.calculateLTV();
      expect(ltvBefore.toNumber()).to.be.closeTo(targetLTV, allowedLTVDrift);
      const newLTV = 0;
      await strategy.setLeverage(newLTV, newLTV+100, true);
      const smallWithdrawAmount = toWantUnit('1');
      const userBalance = await want.balanceOf(wantHolderAddr);
      await vault.connect(wantHolder)['withdraw(uint256,address,address)'](smallWithdrawAmount, wantHolderAddr, wantHolderAddr);
      await strategy.harvest();
      const userBalanceAfterWithdraw = await want.balanceOf(wantHolderAddr);
      const ltvAfter = await strategy.calculateLTV();
      expect(ltvAfter.toNumber()).to.be.closeTo(newLTV, allowedLTVDrift);

      const expectedBalance = userBalance.add(smallWithdrawAmount);

      expect(userBalanceAfterWithdraw).to.be.closeTo(expectedBalance, toWantUnit('0.00001'));
    });

    it('should be able to harvest', async function () {
      await vault.connect(wantHolder)['deposit(uint256)'](1000);
      await strategy.harvest();
      await moveTimeForward(3600);
      await strategy.harvest();
  
    });

    it('should not change leverage on withdraw when still in the allowed LTV', async function () {
      const depositAmount = toWantUnit('10000');
      await vault.connect(wantHolder)['deposit(uint256)'](depositAmount);
      await strategy.harvest();
      const ltvBefore = await strategy.calculateLTV();
      expect(ltvBefore.toNumber()).to.be.closeTo(targetLTV, allowedLTVDrift);

      const userBalance = await want.balanceOf(wantHolderAddr);
      const smallWithdrawAmount = toWantUnit('0.5');
      await vault.connect(wantHolder)['withdraw(uint256,address,address)'](smallWithdrawAmount, wantHolderAddr, wantHolderAddr);
      await strategy.harvest();
      const userBalanceAfterWithdraw = await want.balanceOf(wantHolderAddr);
      const ltvAfter = await strategy.calculateLTV();
      expect(ltvAfter.toNumber()).to.be.closeTo(targetLTV, allowedLTVDrift);

      const expectedBalance = userBalance.add(smallWithdrawAmount);

      expect(userBalanceAfterWithdraw).to.be.closeTo(expectedBalance, toWantUnit('0.00001'));
    });

    it('should handle small deposit + withdraw', async function () {
      const userBalance = await want.balanceOf(wantHolderAddr);
      const depositAmount = toWantUnit('0.1');

      await vault.connect(wantHolder)['deposit(uint256)'](depositAmount);
      await strategy.harvest();

      await moveTimeForward(360000);
      await strategy.harvest();
      await vault.connect(wantHolder)['withdraw(uint256,address,address)'](depositAmount, wantHolderAddr, wantHolderAddr);
      const newUserVaultBalance = await vault.balanceOf(wantHolderAddr);
      const userBalanceAfterWithdraw = await want.balanceOf(wantHolderAddr);
      const expectedBalance = userBalance;
      console.log(`expected balance is ${expectedBalance}, userBalanceAfterWithdraw is ${userBalanceAfterWithdraw}`);
      const isSmallBalanceDifference = expectedBalance.sub(userBalanceAfterWithdraw) < 100;
      expect(isSmallBalanceDifference).to.equal(true);
    });

    it('should provide yield', async function () {
      const timeToSkip = 3600;
      const initialUserBalance = await want.balanceOf(wantHolderAddr);
      const depositAmount = initialUserBalance.div(10);

      await vault.connect(wantHolder)['deposit(uint256)'](depositAmount);
      await strategy.harvest();
      const initialVaultBalance = await vault.totalAssets();

      const numHarvests = 5;
      for (let i = 0; i < numHarvests; i++) {
        await moveTimeForward(timeToSkip);
        await strategy.harvest();
      }

      const finalVaultBalance = await vault.totalAssets();
      expect(finalVaultBalance).to.be.gt(initialVaultBalance);
    });
  });

  describe('Vault<>Strat accounting', function () {
    it('Strat gets more money when it flows in', async function () {
      //const {vault, strategy, want, wantHolder} = await loadFixture(deployVaultAndStrategyAndGetSigners);
      await vault.connect(wantHolder)['deposit(uint256)'](toWantUnit('500'));
      await strategy.harvest();
      //await moveTimeForward(3600);
      let vaultBalance = await want.balanceOf(vault.address);
      expect(vaultBalance).to.be.gte(ethers.utils.parseEther('50'));
      let stratBalance = await strategy.balanceOf();
      expect(stratBalance).to.be.gte(ethers.utils.parseEther('449.99'));

      await vault.connect(wantHolder)['deposit(uint256)'](toWantUnit('500'));
      await strategy.harvest();
      //await moveTimeForward(3600);
      vaultBalance = await want.balanceOf(vault.address);
      expect(vaultBalance).to.be.gte(ethers.utils.parseEther('99.999'));
      stratBalance = await strategy.balanceOf();
      expect(stratBalance).to.be.gte(ethers.utils.parseEther('899.999'));
    });

    it('Vault pulls funds from strat as needed', async function () {
      //const {vault, strategy, want, wantHolder} = await loadFixture(deployVaultAndStrategyAndGetSigners);
      await vault.connect(wantHolder)['deposit(uint256)'](toWantUnit('1000'));
      await strategy.harvest();
      //await moveTimeForward(3600);
      let vaultBalance = await want.balanceOf(vault.address);
      expect(vaultBalance).to.be.gte(ethers.utils.parseEther('100'));
      let stratBalance = await strategy.balanceOf();
      expect(stratBalance).to.be.gte(ethers.utils.parseEther('899.99'));

      await vault.updateStrategyAllocBPS(strategy.address, 7000);
      await strategy.harvest();
      //await moveTimeForward(3600);
      vaultBalance = await want.balanceOf(vault.address);
      expect(vaultBalance).to.be.gte(ethers.utils.parseEther('300'));
      stratBalance = await strategy.balanceOf();
      expect(stratBalance).to.be.gte(ethers.utils.parseEther('699.99'));

      await vault.connect(wantHolder)['deposit(uint256)'](toWantUnit('100'));
      await strategy.harvest();
      await moveTimeForward(3600);
      vaultBalance = await want.balanceOf(vault.address);
      expect(vaultBalance).to.be.gte(ethers.utils.parseEther('329.99'));
      stratBalance = await strategy.balanceOf();
      expect(stratBalance).to.be.gte(ethers.utils.parseEther('769.99'));
    });
  });

  describe('Emergency scenarios', function () {
    it('Vault should handle emergency shutdown', async function () {
      await vault.connect(wantHolder)['deposit(uint256)'](toWantUnit('10000'));
      await moveTimeForward(3600);
      await strategy.harvest();
      let vaultBalance = await want.balanceOf(vault.address);
      expect(vaultBalance).to.equal(ethers.utils.parseEther('1000'));
      let stratBalance = await strategy.balanceOf();
      expectedStrategyBalance = ethers.utils.parseEther('9000');
      smallDifference = expectedStrategyBalance.div(1e12);
      console.log(`expected balance is ${expectedStrategyBalance}, stratBalance is ${stratBalance}`);
      isSmallBalanceDifference = expectedStrategyBalance.sub(stratBalance).lt(smallDifference);
      expect(isSmallBalanceDifference).to.equal(true);

      await vault.setEmergencyShutdown(true);
      await strategy.harvest();
      vaultBalance = await want.balanceOf(vault.address);
      expect(vaultBalance).to.be.gte(ethers.utils.parseEther('10000'));
      stratBalance = await strategy.balanceOf();
      smallDifference = vaultBalance.div(1e12);
      isSmallBalanceDifference = stratBalance.lt(smallDifference);
      expect(isSmallBalanceDifference).to.equal(true);
    });

    it('Strategy should handle emergency exit', async function () {
      await vault.connect(wantHolder)['deposit(uint256)'](toWantUnit('1000'));
      await moveTimeForward(3600);
      await strategy.harvest();
      let vaultBalance = await want.balanceOf(vault.address);
      let stratBalance = await strategy.balanceOf();
      let expectedStrategyBalance = ethers.utils.parseEther('900');
      let smallDifference = expectedStrategyBalance.div(1e12);
      let isSmallBalanceDifference = expectedStrategyBalance.sub(stratBalance).lt(smallDifference);
      expect(isSmallBalanceDifference).to.equal(true);

      await vault.setEmergencyShutdown(true);
      await strategy.harvest();
      vaultBalance = await want.balanceOf(vault.address);
      expect(vaultBalance).to.be.gte(ethers.utils.parseEther('999.99'));
      stratBalance = await strategy.balanceOf();
      smallDifference = vaultBalance.div(1e12);
      isSmallBalanceDifference = stratBalance.lt(smallDifference);
      expect(isSmallBalanceDifference).to.equal(true);
    });
  });
});
