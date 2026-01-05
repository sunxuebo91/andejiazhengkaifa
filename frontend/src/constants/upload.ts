export const FILE_UPLOAD_CONFIG = {
  maxSize: 5 * 1024 * 1024, // 5MB
  maxVideoSize: 10 * 1024 * 1024, // 10MB
  allowedImageTypes: ['image/jpeg', 'image/jpg', 'image/png'] as const,
  allowedPdfTypes: ['application/pdf'] as const,
  allowedVideoTypes: ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'] as const,
  maxPhotoCount: 30,
  maxCertificateCount: 30,
  maxMedicalReportCount: 10,
  maxMedicalPdfCount: 5
} as const;

export type FileType = 'image/jpeg' | 'image/jpg' | 'image/png' | 'application/pdf' | 'video/mp4' | 'video/quicktime' | 'video/x-msvideo' | 'video/webm';
export type ImageType = 'image/jpeg' | 'image/jpg' | 'image/png';
export type VideoType = 'video/mp4' | 'video/quicktime' | 'video/x-msvideo' | 'video/webm';