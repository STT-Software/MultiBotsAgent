/**
 * Networking — VPC, subnets, security groups.
 *
 * TODO: Implementar cuando se necesite VPC para RDS, Fargate, etc.
 * En stages personales, se referencia la VPC del entorno dev.
 * En entornos reales, se crea una VPC propia.
 *
 * Ejemplo de implementación:
 *
 * import { isPersonalStage } from "../helpers/stage";
 *
 * const vpc = isPersonalStage($app.stage)
 *   ? aws.ec2.Vpc.get("MainVpc", "vpc-xxxxxxxx")
 *   : new aws.ec2.Vpc("MainVpc", { cidrBlock: "10.0.0.0/16" });
 *
 * export { vpc };
 */
