const hre = require('hardhat');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('Deploying EvidenceContract to Ganache...');

  const EvidenceContract = await hre.ethers.getContractFactory('EvidenceContract');
  const contract = await EvidenceContract.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log('✅ EvidenceContract deployed at:', address);

  // Save the address + ABI so the backend knows how to talk to it
  const artifact = await hre.artifacts.readArtifact('EvidenceContract');
  const deployment = {
    address,
    abi: artifact.abi,
    network: 'ganache',
    deployedAt: new Date().toISOString(),
  };

  const outPath = path.join(__dirname, '..', 'deployed-contract.json');
  fs.writeFileSync(outPath, JSON.stringify(deployment, null, 2));
  console.log('✅ Saved contract info to', outPath);
  console.log('\nNext: copy deployed-contract.json into your backend folder (see README).');
}

main().catch((err) => {
  console.error('❌ Deployment failed:', err.message);
  process.exit(1);
});
