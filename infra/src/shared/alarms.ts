/**
 * CloudWatch Alarms — Monitoreo de la cola de emails.
 *
 * Define Metric Filters que extraen métricas del log estructurado JSON
 * emitido por el EmailWorkerCronService (metricType: "EMAIL_WORKER_METRICS"),
 * y CloudWatch Alarms que alertan cuando:
 *
 * - email-queue-backlog: pendingCount > 50 por 10 minutos
 * - email-queue-failures: failedCount > 20
 *
 * Los logs del servicio Fargate se envían a CloudWatch Logs automáticamente.
 * El worker emite un JSON con la estructura:
 *   { "metricType": "EMAIL_WORKER_METRICS", "pendingCount": N, "failedCount": N, ... }
 *
 * Validates: Requirements 8.1, 8.2, 8.3
 */

import * as aws from "@pulumi/aws";
import { apiMultiBotsLogGroupName } from "../services/api-multi-bots";

const metricsNamespace = "MultiBotsAgent/EmailWorker";

// ─── Metric Filter: pendingCount ────────────────────────────────────────────

const pendingCountMetricFilter = new aws.cloudwatch.LogMetricFilter(
  "EmailQueuePendingCountFilter",
  {
    name: "EmailQueuePendingCount",
    logGroupName: apiMultiBotsLogGroupName,
    pattern: '{ $.metricType = "EMAIL_WORKER_METRICS" }',
    metricTransformation: {
      name: "EmailQueuePendingCount",
      namespace: metricsNamespace,
      value: "$.pendingCount",
      defaultValue: "0",
    },
  },
);

// ─── Metric Filter: failedCount ─────────────────────────────────────────────

const failedCountMetricFilter = new aws.cloudwatch.LogMetricFilter(
  "EmailQueueFailedCountFilter",
  {
    name: "EmailQueueFailedCount",
    logGroupName: apiMultiBotsLogGroupName,
    pattern: '{ $.metricType = "EMAIL_WORKER_METRICS" }',
    metricTransformation: {
      name: "EmailQueueFailedCount",
      namespace: metricsNamespace,
      value: "$.failedCount",
      defaultValue: "0",
    },
  },
);

// ─── Metric Filter: avgQueueTimeMs ──────────────────────────────────────────

const avgQueueTimeMetricFilter = new aws.cloudwatch.LogMetricFilter(
  "EmailQueueAvgTimeFilter",
  {
    name: "EmailQueueAvgQueueTimeMs",
    logGroupName: apiMultiBotsLogGroupName,
    pattern: '{ $.metricType = "EMAIL_WORKER_METRICS" }',
    metricTransformation: {
      name: "EmailQueueAvgQueueTimeMs",
      namespace: metricsNamespace,
      value: "$.avgQueueTimeMs",
      defaultValue: "0",
    },
  },
);

// ─── Alarm: email-queue-backlog ─────────────────────────────────────────────
// Triggers when pendingCount > 50 for 10 minutes

const emailQueueBacklogAlarm = new aws.cloudwatch.MetricAlarm(
  "EmailQueueBacklogAlarm",
  {
    name: `email-queue-backlog-${$app.stage}`,
    alarmDescription:
      "La cola de emails tiene más de 50 mensajes pendientes por más de 10 minutos",
    metricName: "EmailQueuePendingCount",
    namespace: metricsNamespace,
    statistic: "Maximum",
    period: 600, // 10 minutos
    evaluationPeriods: 1,
    threshold: 50,
    comparisonOperator: "GreaterThanThreshold",
    treatMissingData: "notBreaching",
  },
);

// ─── Alarm: email-queue-failures ────────────────────────────────────────────
// Triggers when failedCount > 20

const emailQueueFailuresAlarm = new aws.cloudwatch.MetricAlarm(
  "EmailQueueFailuresAlarm",
  {
    name: `email-queue-failures-${$app.stage}`,
    alarmDescription:
      "La cola de emails tiene más de 20 mensajes con status failed",
    metricName: "EmailQueueFailedCount",
    namespace: metricsNamespace,
    statistic: "Maximum",
    period: 300, // 5 minutos
    evaluationPeriods: 1,
    threshold: 20,
    comparisonOperator: "GreaterThanThreshold",
    treatMissingData: "notBreaching",
  },
);

export {
  pendingCountMetricFilter,
  failedCountMetricFilter,
  avgQueueTimeMetricFilter,
  emailQueueBacklogAlarm,
  emailQueueFailuresAlarm,
};
