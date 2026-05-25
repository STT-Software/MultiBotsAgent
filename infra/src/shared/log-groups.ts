/**
 * Nombres de Log Groups de CloudWatch.
 * Centralizados aquí para evitar dependencias circulares entre servicios y alarms.
 */

import * as aws from "@pulumi/aws";

/**
 * Nombre del log group para el servicio API Multi Bots.
 */
export const apiMultiBotsLogGroupName = `/multibotagents/${$app.stage}/api-multi-bots`;

/**
 * Log Group creado explícitamente para garantizar que existe antes
 * de que los Metric Filters y el servicio intenten usarlo.
 * Se usa `import` para adoptar el recurso si ya existe en AWS.
 */
export const apiMultiBotsLogGroup = new aws.cloudwatch.LogGroup(
  "ApiMultiBotsLogGroup",
  {
    name: apiMultiBotsLogGroupName,
    retentionInDays: 30,
  },
  {
    import: apiMultiBotsLogGroupName,
    ignoreChanges: ["name"],
  },
);
