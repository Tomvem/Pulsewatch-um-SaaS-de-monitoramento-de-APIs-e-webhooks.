CREATE TYPE "HttpMethod" AS ENUM ('GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD');
CREATE TYPE "MonitorStatus" AS ENUM ('UP', 'DOWN', 'PENDING');
CREATE TYPE "AlertType" AS ENUM ('DOWN', 'RECOVERY');

CREATE TABLE "users" (
  "id" UUID NOT NULL,
  "name" VARCHAR(80) NOT NULL,
  "email" VARCHAR(255) NOT NULL,
  "password_hash" VARCHAR(255) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sessions" (
  "id" UUID NOT NULL,
  "token_hash" CHAR(64) NOT NULL,
  "user_id" UUID NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "monitors" (
  "id" UUID NOT NULL,
  "owner_id" UUID NOT NULL,
  "name" VARCHAR(80) NOT NULL,
  "url" TEXT NOT NULL,
  "method" "HttpMethod" NOT NULL DEFAULT 'GET',
  "interval_minutes" INTEGER NOT NULL DEFAULT 5,
  "timeout_ms" INTEGER NOT NULL DEFAULT 10000,
  "headers" JSONB NOT NULL DEFAULT '{}',
  "alert_webhook" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "status" "MonitorStatus" NOT NULL DEFAULT 'PENDING',
  "last_status_code" INTEGER,
  "last_latency_ms" INTEGER,
  "last_checked_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "monitors_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ping_logs" (
  "id" UUID NOT NULL,
  "monitor_id" UUID NOT NULL,
  "status" "MonitorStatus" NOT NULL,
  "status_code" INTEGER,
  "latency_ms" INTEGER NOT NULL,
  "error" TEXT,
  "checked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ping_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "alerts" (
  "id" UUID NOT NULL,
  "monitor_id" UUID NOT NULL,
  "type" "AlertType" NOT NULL,
  "message" TEXT NOT NULL,
  "delivered" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions"("token_hash");
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");
CREATE INDEX "monitors_owner_id_active_idx" ON "monitors"("owner_id", "active");
CREATE INDEX "monitors_active_last_checked_at_idx" ON "monitors"("active", "last_checked_at");
CREATE INDEX "ping_logs_monitor_id_checked_at_idx" ON "ping_logs"("monitor_id", "checked_at" DESC);
CREATE INDEX "alerts_monitor_id_created_at_idx" ON "alerts"("monitor_id", "created_at" DESC);

ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "monitors" ADD CONSTRAINT "monitors_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ping_logs" ADD CONSTRAINT "ping_logs_monitor_id_fkey" FOREIGN KEY ("monitor_id") REFERENCES "monitors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_monitor_id_fkey" FOREIGN KEY ("monitor_id") REFERENCES "monitors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
