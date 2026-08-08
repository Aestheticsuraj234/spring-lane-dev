-- CreateEnum
CREATE TYPE "DeploymentStatus" AS ENUM ('QUEUED', 'BUILDING', 'DEPLOYING', 'LIVE', 'FAILED', 'STOPPED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('MEMBER', 'ADMIN');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "githubId" INTEGER NOT NULL,
    "login" TEXT NOT NULL,
    "name" TEXT,
    "avatarUrl" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GithubConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessTokenEncrypted" TEXT NOT NULL,
    "scopes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GithubConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "App" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "repoFullName" TEXT NOT NULL,
    "branch" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "autoDeploy" BOOLEAN NOT NULL DEFAULT false,
    "port" INTEGER NOT NULL DEFAULT 8080,
    "memoryMb" INTEGER NOT NULL DEFAULT 512,
    "cpus" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "App_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deployment" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "status" "DeploymentStatus" NOT NULL DEFAULT 'QUEUED',
    "commitSha" TEXT,
    "commitMessage" TEXT,
    "imageTag" TEXT,
    "containerId" TEXT,
    "url" TEXT,
    "errorMessage" TEXT,
    "logPath" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Deployment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnvVar" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "valueEncrypted" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnvVar_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_githubId_key" ON "User"("githubId");

-- CreateIndex
CREATE UNIQUE INDEX "GithubConnection_userId_key" ON "GithubConnection"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "App_name_key" ON "App"("name");

-- CreateIndex
CREATE INDEX "App_ownerId_idx" ON "App"("ownerId");

-- CreateIndex
CREATE INDEX "Deployment_appId_createdAt_idx" ON "Deployment"("appId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "EnvVar_appId_key_key" ON "EnvVar"("appId", "key");

-- AddForeignKey
ALTER TABLE "GithubConnection" ADD CONSTRAINT "GithubConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "App" ADD CONSTRAINT "App_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deployment" ADD CONSTRAINT "Deployment_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnvVar" ADD CONSTRAINT "EnvVar_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;
