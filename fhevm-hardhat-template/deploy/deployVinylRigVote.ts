import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedVinylRigVote = await deploy("VinylRigVote", {
    from: deployer,
    log: true,
  });

  console.log(`VinylRigVote contract: `, deployedVinylRigVote.address);
};
export default func;
func.id = "deploy_vinylRigVote"; // id required to prevent reexecution
func.tags = ["VinylRigVote"];

