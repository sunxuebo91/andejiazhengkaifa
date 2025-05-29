export const FILE_UPLOAD_CONFIG = {
  maxSize: 5 * 1024 * 1024, // 5MB
  allowedImageTypes: ['image/jpeg', 'image/jpg', 'image/png'] as const,
  allowedPdfTypes: ['application/pdf'] as const,
  maxPhotoCount: 10,
  maxCertificateCount: 10,
  maxMedicalReportCount: 10,
  maxMedicalPdfCount: 5
} as const;

export type FileType = 'image/jpeg' | 'image/jpg' | 'image/png' | 'application/pdf';
export type ImageType = 'image/jpeg' | 'image/jpg' | 'image/png'; 