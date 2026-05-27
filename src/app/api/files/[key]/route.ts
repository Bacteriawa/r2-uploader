import { NextResponse } from 'next/server';
import { getS3Client, getBucketName, verifyAuth } from '@/lib/s3';
import { DeleteObjectCommand, CopyObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export async function DELETE(req: Request, { params }: { params: Promise<{ key: string }> }) {
  try {
    verifyAuth(req);
    const client = getS3Client(req);
    const bucket = getBucketName(req);
    const resolvedParams = await params;
    const key = decodeURIComponent(resolvedParams.key);

    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    await client.send(command);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ key: string }> }) {
  try {
    verifyAuth(req);
    const client = getS3Client(req);
    const bucket = getBucketName(req);
    const resolvedParams = await params;
    const key = decodeURIComponent(resolvedParams.key);
    
    const body = await req.json();
    const { action, newKey } = body;

    if (action === 'rename') {
      if (!newKey) throw new Error('newKey is required');
      
      // Copy object
      const copyCommand = new CopyObjectCommand({
        Bucket: bucket,
        CopySource: `${bucket}/${encodeURIComponent(key)}`,
        Key: newKey,
      });
      await client.send(copyCommand);

      // Delete old object
      const deleteCommand = new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      });
      await client.send(deleteCommand);
      
      return NextResponse.json({ success: true });
    }
    
    if (action === 'download') {
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
        ResponseContentDisposition: `attachment; filename="${encodeURIComponent(key)}"`,
      });
      const url = await getSignedUrl(client, command, { expiresIn: 3600 });
      return NextResponse.json({ success: true, url });
    }

    throw new Error('Invalid action');
  } catch (error: any) {
    console.error('File operation error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
