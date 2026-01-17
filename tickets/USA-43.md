# USA-43: Azure Blob Storage for Mockups

**Epic:** USA - User Story Agent
**Type:** Feature
**Priority:** Medium
**Status:** Ready
**Dependencies:** USA-31, USA-37

## Description

Implement Azure Blob Storage integration for uploading and managing mockup files (images, PDFs) that accompany user stories. Users upload mockups which the agent can reference during processing.

## Problem Statement

- User stories often come with design mockups
- Need secure, temporary storage for uploaded files
- Files should be associated with jobs
- Must support presigned URLs for direct upload
- Need automatic cleanup of old files

## Acceptance Criteria

- [ ] Create Azure Blob Storage client with Managed Identity support
- [ ] Implement presigned URL generation for uploads
- [ ] Create upload endpoint (`POST /api/v1/uploads/presigned`)
- [ ] Store file metadata in job_files table
- [ ] Support multiple files per job
- [ ] Validate file types (PNG, JPG, PDF, SVG)
- [ ] Enforce file size limits per tier
- [ ] Configure 30-day retention policy
- [ ] Download mockups for agent processing

## Files

### New Directory Structure
```
src/storage/
├── blob-client.ts
├── upload-handler.ts
└── index.ts
```

### New Files
- `src/storage/blob-client.ts` - Azure Blob Storage client
- `src/storage/upload-handler.ts` - Upload processing
- `src/storage/index.ts` - Barrel exports
- `src/api/routes/uploads.ts` - Upload endpoints

## Technical Notes

### Blob Client

```typescript
// src/storage/blob-client.ts
import {
  BlobServiceClient,
  ContainerClient,
  BlobSASPermissions,
  generateBlobSASQueryParameters,
  StorageSharedKeyCredential,
} from '@azure/storage-blob';
import { DefaultAzureCredential } from '@azure/identity';
import { logger } from '../utils/logger.js';

let containerClient: ContainerClient | null = null;

export interface BlobConfig {
  accountName: string;
  containerName: string;
  accountKey?: string; // For local dev, use Managed Identity in production
}

export function getBlobClient(): ContainerClient {
  if (containerClient) return containerClient;

  const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
  const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'mockups';

  if (!accountName) {
    throw new Error('AZURE_STORAGE_ACCOUNT_NAME required');
  }

  const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;

  let blobServiceClient: BlobServiceClient;

  if (accountKey) {
    // Local development with account key
    const sharedKeyCredential = new StorageSharedKeyCredential(
      accountName,
      accountKey
    );
    blobServiceClient = new BlobServiceClient(
      `https://${accountName}.blob.core.windows.net`,
      sharedKeyCredential
    );
  } else {
    // Production with Managed Identity
    const credential = new DefaultAzureCredential();
    blobServiceClient = new BlobServiceClient(
      `https://${accountName}.blob.core.windows.net`,
      credential
    );
  }

  containerClient = blobServiceClient.getContainerClient(containerName);

  logger.info('Blob storage initialized', { accountName, containerName });

  return containerClient;
}

export interface PresignedUrlOptions {
  tenantId: string;
  jobId: string;
  fileName: string;
  contentType: string;
  expiresInMinutes?: number;
}

export async function generateUploadUrl(
  options: PresignedUrlOptions
): Promise<{ uploadUrl: string; blobPath: string }> {
  const {
    tenantId,
    jobId,
    fileName,
    contentType,
    expiresInMinutes = 15,
  } = options;

  // Sanitize filename
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const blobPath = `${tenantId}/${jobId}/${safeName}`;

  const container = getBlobClient();
  const blobClient = container.getBlockBlobClient(blobPath);

  // Generate SAS token
  const expiresOn = new Date();
  expiresOn.setMinutes(expiresOn.getMinutes() + expiresInMinutes);

  const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
  const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME!;

  if (accountKey) {
    // Local dev: generate SAS with account key
    const sharedKeyCredential = new StorageSharedKeyCredential(
      accountName,
      accountKey
    );

    const sasToken = generateBlobSASQueryParameters(
      {
        containerName: container.containerName,
        blobName: blobPath,
        permissions: BlobSASPermissions.parse('cw'), // Create, Write
        expiresOn,
        contentType,
      },
      sharedKeyCredential
    ).toString();

    return {
      uploadUrl: `${blobClient.url}?${sasToken}`,
      blobPath,
    };
  } else {
    // Production: use user delegation key
    const blobServiceClient = container.getBlobServiceClient();

    const startsOn = new Date();
    startsOn.setMinutes(startsOn.getMinutes() - 5); // 5 min buffer

    const userDelegationKey = await blobServiceClient.getUserDelegationKey(
      startsOn,
      expiresOn
    );

    const sasToken = generateBlobSASQueryParameters(
      {
        containerName: container.containerName,
        blobName: blobPath,
        permissions: BlobSASPermissions.parse('cw'),
        expiresOn,
        contentType,
      },
      userDelegationKey,
      accountName
    ).toString();

    return {
      uploadUrl: `${blobClient.url}?${sasToken}`,
      blobPath,
    };
  }
}

export async function generateDownloadUrl(
  blobPath: string,
  expiresInMinutes = 60
): Promise<string> {
  const container = getBlobClient();
  const blobClient = container.getBlockBlobClient(blobPath);

  // Similar SAS generation for read permission
  const expiresOn = new Date();
  expiresOn.setMinutes(expiresOn.getMinutes() + expiresInMinutes);

  const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
  const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME!;

  if (accountKey) {
    const sharedKeyCredential = new StorageSharedKeyCredential(
      accountName,
      accountKey
    );

    const sasToken = generateBlobSASQueryParameters(
      {
        containerName: container.containerName,
        blobName: blobPath,
        permissions: BlobSASPermissions.parse('r'),
        expiresOn,
      },
      sharedKeyCredential
    ).toString();

    return `${blobClient.url}?${sasToken}`;
  }

  // Production path similar to upload
  throw new Error('User delegation not implemented for download');
}

export async function downloadBlob(blobPath: string): Promise<Buffer> {
  const container = getBlobClient();
  const blobClient = container.getBlockBlobClient(blobPath);

  const downloadResponse = await blobClient.download();
  const chunks: Buffer[] = [];

  for await (const chunk of downloadResponse.readableStreamBody!) {
    chunks.push(Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

export async function deleteBlob(blobPath: string): Promise<void> {
  const container = getBlobClient();
  const blobClient = container.getBlockBlobClient(blobPath);
  await blobClient.deleteIfExists();
}
```

### Upload Handler

```typescript
// src/storage/upload-handler.ts
import { query, queryOne } from '../db/client.js';
import { JobFile } from '../db/schema.js';
import { getTierLimits } from '../quota/tiers.js';
import { QuotaTier } from '../auth/context.js';
import { ApiError } from '../api/middleware/error-handler.js';

const ALLOWED_CONTENT_TYPES = [
  'image/png',
  'image/jpeg',
  'image/svg+xml',
  'application/pdf',
];

const MAX_FILE_SIZE_MB: Record<QuotaTier, number> = {
  free: 5,
  pro: 10,
  enterprise: 25,
};

const MAX_FILES_PER_JOB: Record<QuotaTier, number> = {
  free: 3,
  pro: 10,
  enterprise: 25,
};

export interface ValidateUploadInput {
  fileName: string;
  contentType: string;
  sizeBytes: number;
  quotaTier: QuotaTier;
  jobId: string;
}

export async function validateUpload(input: ValidateUploadInput): Promise<void> {
  const { fileName, contentType, sizeBytes, quotaTier, jobId } = input;

  // Validate content type
  if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
    throw new ApiError(
      400,
      `File type not allowed. Supported: ${ALLOWED_CONTENT_TYPES.join(', ')}`,
      'INVALID_FILE_TYPE'
    );
  }

  // Validate file size
  const maxSizeBytes = MAX_FILE_SIZE_MB[quotaTier] * 1024 * 1024;
  if (sizeBytes > maxSizeBytes) {
    throw new ApiError(
      400,
      `File too large. Max size for ${quotaTier}: ${MAX_FILE_SIZE_MB[quotaTier]}MB`,
      'FILE_TOO_LARGE'
    );
  }

  // Validate file count per job
  const existingCount = await queryOne<{ count: string }>(
    'SELECT COUNT(*) as count FROM job_files WHERE job_id = $1',
    [jobId]
  );

  const count = parseInt(existingCount?.count || '0', 10);
  const maxFiles = MAX_FILES_PER_JOB[quotaTier];

  if (count >= maxFiles) {
    throw new ApiError(
      400,
      `Maximum files per job exceeded (${maxFiles} for ${quotaTier})`,
      'TOO_MANY_FILES'
    );
  }
}

export async function recordFileUpload(
  jobId: string,
  fileName: string,
  blobPath: string,
  contentType: string,
  sizeBytes: number
): Promise<JobFile> {
  const result = await queryOne<JobFile>(
    `INSERT INTO job_files (job_id, file_name, blob_path, content_type, size_bytes)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [jobId, fileName, blobPath, contentType, sizeBytes]
  );

  return result!;
}

export async function getJobFiles(jobId: string): Promise<JobFile[]> {
  const { rows } = await query<JobFile>(
    'SELECT * FROM job_files WHERE job_id = $1',
    [jobId]
  );
  return rows;
}
```

### Upload Routes

```typescript
// src/api/routes/uploads.ts
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../../auth/middleware.js';
import { rateLimitMiddleware } from '../../quota/middleware.js';
import { generateUploadUrl } from '../../storage/blob-client.js';
import { validateUpload, recordFileUpload } from '../../storage/upload-handler.js';
import { getJobById } from '../../worker/job-repository.js';
import { ApiError } from '../middleware/error-handler.js';

export const uploadsRouter = Router();

uploadsRouter.use(authMiddleware);
uploadsRouter.use(rateLimitMiddleware);

const PresignedUrlSchema = z.object({
  jobId: z.string().uuid(),
  fileName: z.string().min(1).max(255),
  contentType: z.string(),
  sizeBytes: z.number().positive(),
});

// Get presigned URL for direct upload
uploadsRouter.post(
  '/presigned',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = PresignedUrlSchema.safeParse(req.body);
      if (!result.success) {
        throw new ApiError(400, result.error.message, 'VALIDATION_ERROR');
      }

      const { jobId, fileName, contentType, sizeBytes } = result.data;
      const user = req.user!;

      // Verify job exists and belongs to user
      const job = await getJobById(jobId, user.userId);
      if (!job) {
        throw new ApiError(404, 'Job not found', 'NOT_FOUND');
      }

      // Validate upload
      await validateUpload({
        fileName,
        contentType,
        sizeBytes,
        quotaTier: user.quotaTier,
        jobId,
      });

      // Generate presigned URL
      const { uploadUrl, blobPath } = await generateUploadUrl({
        tenantId: user.tenantId,
        jobId,
        fileName,
        contentType,
      });

      res.json({
        uploadUrl,
        blobPath,
        expiresIn: 15 * 60, // 15 minutes
        method: 'PUT',
        headers: {
          'Content-Type': contentType,
          'x-ms-blob-type': 'BlockBlob',
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Confirm upload completed
const ConfirmUploadSchema = z.object({
  jobId: z.string().uuid(),
  blobPath: z.string(),
  fileName: z.string(),
  contentType: z.string(),
  sizeBytes: z.number().positive(),
});

uploadsRouter.post(
  '/confirm',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = ConfirmUploadSchema.safeParse(req.body);
      if (!result.success) {
        throw new ApiError(400, result.error.message, 'VALIDATION_ERROR');
      }

      const { jobId, blobPath, fileName, contentType, sizeBytes } = result.data;
      const user = req.user!;

      // Verify job belongs to user
      const job = await getJobById(jobId, user.userId);
      if (!job) {
        throw new ApiError(404, 'Job not found', 'NOT_FOUND');
      }

      // Record file in database
      const file = await recordFileUpload(
        jobId,
        fileName,
        blobPath,
        contentType,
        sizeBytes
      );

      res.status(201).json({
        file: {
          id: file.id,
          fileName: file.file_name,
          contentType: file.content_type,
          sizeBytes: file.size_bytes,
          uploadedAt: file.uploaded_at,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);
```

## Environment Variables

```bash
# Azure Storage
AZURE_STORAGE_ACCOUNT_NAME=usastorageaccount
AZURE_STORAGE_CONTAINER_NAME=mockups

# For local development only (use Managed Identity in production)
AZURE_STORAGE_ACCOUNT_KEY=<your-key>
```

## API Examples

### Request Presigned URL

```bash
curl -X POST http://localhost:3000/api/v1/uploads/presigned \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "jobId": "123e4567-e89b-12d3-a456-426614174000",
    "fileName": "mockup.png",
    "contentType": "image/png",
    "sizeBytes": 1024000
  }'

# Response:
{
  "uploadUrl": "https://usastorage.blob.core.windows.net/mockups/tenant/job/mockup.png?sv=2023-01-01&...",
  "blobPath": "tenant-id/job-id/mockup.png",
  "expiresIn": 900,
  "method": "PUT",
  "headers": {
    "Content-Type": "image/png",
    "x-ms-blob-type": "BlockBlob"
  }
}
```

### Upload to Presigned URL

```bash
curl -X PUT "<uploadUrl>" \
  -H "Content-Type: image/png" \
  -H "x-ms-blob-type: BlockBlob" \
  --data-binary @mockup.png
```

### Confirm Upload

```bash
curl -X POST http://localhost:3000/api/v1/uploads/confirm \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "jobId": "...",
    "blobPath": "tenant-id/job-id/mockup.png",
    "fileName": "mockup.png",
    "contentType": "image/png",
    "sizeBytes": 1024000
  }'
```

## Verification

```bash
# Set up local Azurite for testing
docker run -p 10000:10000 mcr.microsoft.com/azure-storage/azurite azurite-blob

# Set environment
export AZURE_STORAGE_ACCOUNT_NAME=devstoreaccount1
export AZURE_STORAGE_ACCOUNT_KEY=<azurite-key>
export AZURE_STORAGE_CONTAINER_NAME=mockups

# Create container
az storage container create -n mockups --connection-string "..."

# Test upload flow
# 1. Get presigned URL
# 2. Upload file
# 3. Confirm upload
# 4. Check job files
curl http://localhost:3000/api/v1/jobs/<id> | jq '.files'
```

## Notes

- Presigned URLs valid for 15 minutes
- Two-step upload: get URL → upload → confirm
- Confirmation records file in database
- Managed Identity for production (no keys in environment)
- 30-day blob lifecycle policy configured in Azure
- Files organized by tenant/job for multi-tenant isolation
