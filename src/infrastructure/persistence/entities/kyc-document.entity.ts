import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { EntityHelper } from '@/utils/entity-helper';
import { DocumentTypeEnum } from '@/domain/enums/document-type.enum';

@Entity('kyc_documents')
export class KycDocumentEntity extends EntityHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', name: 'kyc_verification_id' })
  kycVerificationId: string;

  @ManyToOne('KycVerificationEntity')
  @JoinColumn({ name: 'kyc_verification_id' })
  kycVerification?: unknown;

  @Column({ type: 'enum', enum: DocumentTypeEnum, name: 'document_type' })
  documentType: DocumentTypeEnum;

  @Column({ type: 'varchar', nullable: true, name: 'id_number' })
  idNumber: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'full_name' })
  fullName: string | null;

  @Column({ type: 'date', nullable: true, name: 'date_of_birth' })
  dateOfBirth: Date | null;

  @Column({ type: 'varchar', nullable: true })
  gender: string | null;

  @Column({ type: 'varchar', nullable: true, default: 'Việt Nam' })
  nationality: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'place_of_origin' })
  placeOfOrigin: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'place_of_residence' })
  placeOfResidence: string | null;

  @Column({ type: 'date', nullable: true, name: 'issue_date' })
  issueDate: Date | null;

  @Column({ type: 'date', nullable: true, name: 'expiry_date' })
  expiryDate: Date | null;

  @Column({ type: 'boolean', default: false, name: 'chip_verified' })
  chipVerified: boolean;

  @Column({ type: 'boolean', default: false, name: 'c06_verified' })
  c06Verified: boolean;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 4,
    nullable: true,
    name: 'ocr_accuracy_score',
  })
  ocrAccuracyScore: number | null;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 4,
    nullable: true,
    name: 'authenticity_score',
  })
  authenticityScore: number | null;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 4,
    nullable: true,
    name: 'face_match_score',
  })
  faceMatchScore: number | null;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 4,
    nullable: true,
    name: 'liveness_score',
  })
  livenessScore: number | null;

  @Column({ type: 'jsonb', nullable: true, name: 'raw_ocr_data' })
  rawOcrData: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true, name: 'raw_nfc_data' })
  rawNfcData: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
