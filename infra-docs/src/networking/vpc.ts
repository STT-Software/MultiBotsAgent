/**
 * VPC — Red virtual privada para servicios ECS Fargate.
 *
 * Configura una VPC con 1 AZ y NAT EC2 (t4g.micro) para minimizar costos.
 * Una sola AZ es aceptable para stages de desarrollo y personales.
 * Para producción, se puede incrementar el número de AZs en el futuro.
 *
 * Los módulos que necesiten la VPC (ej: Cluster) importan `vpc` desde aquí.
 */

export const vpc = new sst.aws.Vpc("MainVpc", {
  az: 1,
  nat: {
    ec2: {
      instance: "t4g.micro",
    },
  },
});
