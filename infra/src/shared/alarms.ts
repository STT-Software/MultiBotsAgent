/**
 * CloudWatch Alarms — Monitoreo de la cola de emails.
 *
 * Define un Log Group explícito, Metric Filters que extraen métricas del log
 * estructurado JSON emitido por el EmailWorkerCronService, y CloudWatch Alarms.
 *
 * El Log Group se crea aquí explícitamente para garantizar que existe antes
 * de que los Metric Filters intenten usarlo (resuelve race condition con el servicio).
 *
 * Validates: Requirements 8.1, 8.2, 8.3
 */

import * as aws from "@pulumi/aws";
import { apiMultiBotsLogGroup } from "./log-groups";

const metricsNamespace = "MultiBotsAgent/EmailWorker";

// ─── Metric Filter: pendingCount ────────────────────────────────────────────

const pendingCountMetricFilter = new aws.cloudwatch.LogMetricFilter(
  "EmailQueuePendingCountFilter",
  {
    name: "EmailQueuePendingCount",
    logGroupName: apiMultiBotsLogGroup.name,
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
    logGroupName: apiMultiBotsLogGroup.name,
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
    logGroupName: apiMultiBotsLogGroup.name,
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

const emailQueueBacklogAlarm = new aws.cloudwatch.MetricAlarm(
  "EmailQueueBacklogAlarm",
  {
    name: `email-queue-backlog-${$app.stage}`,
    alarmDescription:
      "La cola de emails tiene más de 50 mensajes pendientes por más de 10 minutos",
    metricName: "EmailQueuePendingCount",
    namespace: metricsNamespace,
    statistic: "Maximum",
    period: 600,
    evaluationPeriods: 1,
    threshold: 50,
    comparisonOperator: "GreaterThanThreshold",
    treatMissingData: "notBreaching",
  },
);

// ─── Alarm: email-queue-failures ────────────────────────────────────────────

const emailQueueFailuresAlarm = new aws.cloudwatch.MetricAlarm(
  "EmailQueueFailuresAlarm",
  {
    name: `email-queue-failures-${$app.stage}`,
    alarmDescription:
      "La cola de emails tiene más de 20 mensajes con status failed",
    metricName: "EmailQueueFailedCount",
    namespace: metricsNamespace,
    statistic: "Maximum",
    period: 300,
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
