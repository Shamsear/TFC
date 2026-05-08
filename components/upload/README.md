# ImageKit Upload Components

This directory contains components for handling image uploads via ImageKit.

## Components

### ImageKitUpload

Main upload component that handles file uploads to ImageKit with built-in provider.

**Usage:**

```tsx
import { ImageKitUpload } from '@/components/upload/ImageKitUpload'

function MyComponent() {
  const handleSuccess = (url: string) => {
    console.log('Uploaded to:', url)
  }

  const handleError = (error: Error) => {
    console.error('Upload failed:', error.message)
  }

  return (
    <ImageKitUpload
      onSuccess={handleSuccess}
      onError={handleError}
      folder="/turf-cats/teams"
      fileName="team-logo"
      accept="image/*"
    />
  )
}
```

**Props:**

- `onSuccess: (url: string) => void` - Called when upload succeeds with the ImageKit URL
- `onError: (error: Error) => void` - Called when upload fails
- `folder?: string` - ImageKit folder path (default: `/turf-cats`)
- `fileName?: string` - Base filename (default: auto-generated with timestamp)
- `accept?: string` - File input accept attribute (default: `image/*`)
- `className?: string` - Additional CSS classes

### ImageKitProvider

Context provider for ImageKit configuration. Used internally by ImageKitUpload.

## Environment Variables

Required environment variables (add to `.env`):

```env
NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY="your-imagekit-public-key"
IMAGEKIT_PRIVATE_KEY="your-imagekit-private-key"
NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT="https://ik.imagekit.io/your-imagekit-id"
```

## API Endpoint

The `/api/imagekit-auth` endpoint provides authentication parameters for client-side uploads.

## Features

- Automatic unique filename generation
- Upload progress indication
- Error handling with user-friendly messages
- Folder organization support
- File type filtering
- Disabled state during upload
