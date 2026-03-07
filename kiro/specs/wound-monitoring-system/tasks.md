# Implementation Plan: AI-Powered Post-Discharge Wound Monitoring System

## Overview

This implementation plan breaks down the wound monitoring system into discrete coding tasks. The system uses Python FastAPI for the backend, React for the frontend, YOLOv8 for wound detection, and AWS services (S3, DynamoDB, Bedrock, Connect) for infrastructure. Tasks are organized to build incrementally, with testing integrated throughout to validate functionality early.

## Tasks

- [ ] 1. Set up core backend infrastructure and data models
  - [ ] 1.1 Implement Pydantic data models for all entities
    - Create Patient, Assessment, PWATScores, VoiceInteraction, Escalation, BoundingBox models in `models/schemas.py`
    - Add validation rules for phone numbers, dates, score ranges
    - _Requirements: 8.1, 8.2, 3.2_
  
  - [ ]* 1.2 Write property tests for data model validation
    - **Property 43: Registration data completeness**
    - **Property 44: Phone number validation**
    - **Property 48: Post-operative day calculation**
    - _Requirements: 8.1, 8.2, 8.7_
  
  - [ ] 1.3 Implement DynamoDB service layer
    - Create functions for put_patient, get_patient, get_all_patients, update_patient
    - Create functions for put_assessment, get_assessments_by_patient, get_assessment
    - Create functions for put_voice_interaction, get_voice_interactions_by_patient
    - Create functions for put_escalation, get_escalations_by_status, update_escalation
    - Add error handling with retry logic for throttling
    - _Requirements: 8.3, 3.8, 4.8, 5.1_
  
  - [ ]* 1.4 Write property tests for DynamoDB operations
    - **Property 45: Patient ID uniqueness**
    - **Property 15: Assessment data persistence**
    - **Property 21: Voice interaction persistence**
    - _Requirements: 8.3, 3.8, 4.8_

- [ ] 2. Implement photo upload and S3 storage
  - [ ] 2.1 Create S3 service for photo upload and retrieval
    - Implement upload_image function with patient_id and assessment_id path structure
    - Implement get_presigned_url function with 1-hour expiration
    - Add AES-256 encryption configuration
    - _Requirements: 1.3, 9.1_
  
  - [ ] 2.2 Implement photo validation logic
    - Create validate_photo function checking resolution, file size, format
    - Add quality checks for brightness and blur detection
    - Return specific error messages for each validation failure
    - _Requirements: 1.2, 1.4_
  
  - [ ]* 2.3 Write property tests for photo validation
    - **Property 1: Photo validation correctness**
    - **Property 3: Validation error specificity**
    - _Requirements: 1.2, 1.4_
  
  - [ ] 2.4 Create photo upload API endpoint
    - Implement POST /api/assessments/upload endpoint
    - Accept multipart form data with file and patient_id
    - Validate photo, upload to S3, return photo_id and URL
    - _Requirements: 1.3, 1.6_
  
  - [ ]* 2.5 Write property tests for upload workflow
    - **Property 2: Photo upload persistence**
    - **Property 4: Upload idempotency**
    - **Property 5: Assessment workflow trigger**
    - _Requirements: 1.3, 1.5, 1.6_

- [ ] 3. Checkpoint - Verify photo upload functionality
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Implement YOLOv8 wound detection service
  - [ ] 4.1 Create YOLO service with model loading and inference
    - Implement get_model function with lazy loading and caching
    - Implement detect_wound function accepting image bytes
    - Extract bounding boxes with confidence scores
    - Crop wound region with 20% padding
    - Generate segmentation mask
    - _Requirements: 2.1, 2.2, 2.5, 2.6_
  
  - [ ] 4.2 Implement multi-wound and low-confidence handling
    - Select largest wound region when multiple detections occur
    - Flag photos for manual review when confidence < 0.6
    - Return structured detection results with has_wound boolean
    - _Requirements: 2.3, 2.4_
  
  - [ ]* 4.3 Write property tests for wound detection
    - **Property 6: Wound detection invocation**
    - **Property 7: Segmentation mask generation**
    - **Property 8: Multiple wound region handling**
    - **Property 9: Low confidence detection handling**
    - **Property 10: Bounding box data flow**
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_
  
  - [ ]* 4.4 Write unit tests for YOLO edge cases
    - Test with images containing no wounds
    - Test with corrupt image files
    - Test with very small/large images
    - _Requirements: 2.4_

- [ ] 5. Implement Amazon Bedrock assessment service
  - [ ] 5.1 Create Bedrock service for wound assessment
    - Implement assess_wound function accepting image bytes and patient context
    - Build prompt with system instructions for structured JSON output
    - Base64 encode image for Bedrock API
    - Parse response JSON into assessment structure
    - _Requirements: 3.1, 3.2_
  
  - [ ] 5.2 Implement healing score calculation logic
    - Calculate base score from PWAT total (0-32 normalized to 0-10)
    - Apply adjustments for granulation tissue, infection signs, necrotic tissue
    - Apply trend adjustment based on previous scores
    - Clamp final score to 0-10 range
    - _Requirements: 3.3_
  
  - [ ] 5.3 Implement assessment classification
    - Classify assessments based on healing score thresholds
    - Determine urgency level based on score and infection status
    - Generate patient-friendly summary text
    - Generate voice agent script
    - _Requirements: 3.4, 3.5, 3.6, 3.7_
  
  - [ ]* 5.4 Write property tests for assessment logic
    - **Property 11: Tissue classification completeness**
    - **Property 12: Healing score range validity**
    - **Property 13: Healing score calculation formula**
    - **Property 14: Assessment classification by score**
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_
  
  - [ ] 5.5 Implement Bedrock error handling and retry logic
    - Add exponential backoff retry (1s, 2s, 4s delays)
    - Handle timeout, rate limiting, invalid responses
    - Use fallback assessment values when all retries fail
    - Queue delayed assessments for background retry
    - _Requirements: 10.5, 10.6_
  
  - [ ]* 5.6 Write property tests for retry logic
    - **Property 55: Bedrock service retry logic**
    - **Property 56: Assessment delay notification**
    - _Requirements: 10.5, 10.6_

- [ ] 6. Integrate assessment pipeline
  - [ ] 6.1 Complete the upload_and_assess endpoint
    - Wire together: photo upload → S3 storage → YOLO detection → Bedrock assessment → DynamoDB storage
    - Handle errors at each stage with appropriate responses
    - Return complete AssessmentResult to client
    - _Requirements: 1.6, 2.1, 3.1, 3.8_
  
  - [ ]* 6.2 Write integration tests for assessment pipeline
    - Test complete flow from photo upload to stored assessment
    - Test error handling at each stage
    - Test with various photo types and patient contexts
    - _Requirements: 1.6, 2.1, 3.1, 3.8_

- [ ] 7. Checkpoint - Verify assessment pipeline
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Implement escalation logic
  - [ ] 8.1 Create escalation service
    - Implement check_escalation_triggers function
    - Check healing score thresholds (< 4.0)
    - Check infection status and necrotic tissue percentage
    - Determine urgency level (critical, high, medium)
    - Create escalation record in DynamoDB
    - _Requirements: 5.1, 5.2, 5.5_
  
  - [ ] 8.2 Integrate escalation checks into assessment workflow
    - Call check_escalation_triggers after assessment completion
    - Create escalation if triggers are met
    - Send notification to clinician dashboard
    - _Requirements: 5.1, 5.4_
  
  - [ ]* 8.3 Write property tests for escalation triggers
    - **Property 23: Low score escalation trigger**
    - **Property 24: Infection-based escalation trigger**
    - **Property 27: Escalation urgency prioritization**
    - _Requirements: 5.1, 5.2, 5.5_
  
  - [ ] 8.4 Implement escalation management endpoints
    - Create GET /api/escalations endpoint for listing escalations
    - Create PUT /api/escalations/{escalation_id} endpoint for status updates
    - Add clinician notes field to updates
    - Send SMS notification when status changes to "action_taken"
    - _Requirements: 5.7, 5.8_
  
  - [ ]* 8.5 Write property tests for escalation management
    - **Property 28: Escalation status transitions**
    - **Property 29: Escalation action notification**
    - _Requirements: 5.7, 5.8_

- [ ] 9. Implement voice agent integration
  - [ ] 9.1 Create voice agent service for Amazon Connect
    - Implement initiate_call function using Connect API
    - Build call flow with greeting, assessment summary, Q&A, follow-up questions, closing
    - Configure Lex bot intents for common patient questions
    - Configure Polly voices for Hindi (Aditi) and English (Raveena)
    - _Requirements: 4.1, 4.2, 4.3, 4.5_
  
  - [ ] 9.2 Implement call scheduling logic
    - Schedule calls within patient's preferred time window
    - Schedule calls within 30 minutes of assessment completion
    - Handle missed calls with retry after 2 hours
    - Send SMS fallback after 2 failed call attempts
    - _Requirements: 4.1, 11.2, 11.3, 11.4_
  
  - [ ] 9.3 Create voice agent webhook endpoints
    - Implement POST /api/voice/initiate-call endpoint
    - Implement POST /api/voice/webhook for Connect callbacks
    - Store call transcripts and patient responses in DynamoDB
    - _Requirements: 4.8, 11.8_
  
  - [ ]* 9.4 Write property tests for voice agent logic
    - **Property 16: Voice call scheduling**
    - **Property 17: Personalized greeting**
    - **Property 18: Assessment data in call script**
    - **Property 19: Language preference adherence**
    - **Property 20: Standardized follow-up questions**
    - **Property 22: Call closing completeness**
    - _Requirements: 4.1, 4.2, 4.3, 4.5, 4.7, 4.9_
  
  - [ ] 9.5 Implement voice-triggered escalations
    - Parse patient responses for fever > 38°C or pain > 7
    - Create urgent escalation when triggers detected
    - Offer clinician callback during call
    - _Requirements: 5.3, 4.6_
  
  - [ ]* 9.6 Write property tests for voice escalations
    - **Property 25: Patient-reported symptom escalation**
    - _Requirements: 5.3_
  
  - [ ]* 9.7 Write property tests for call management
    - **Property 57: Call time window adherence**
    - **Property 58: Missed call retry logic**
    - **Property 59: Failed call SMS fallback**
    - **Property 60: Voice call opt-out handling**
    - **Property 61: Call duration limit enforcement**
    - **Property 62: Call status recording**
    - _Requirements: 11.2, 11.3, 11.4, 11.5, 11.7, 11.8_

- [ ] 10. Implement patient management endpoints
  - [ ] 10.1 Complete patient CRUD endpoints
    - Implement POST /api/patients for patient registration
    - Implement GET /api/patients for listing all patients
    - Implement GET /api/patients/{patient_id} for patient details
    - Implement PUT /api/patients/{patient_id} for profile updates
    - _Requirements: 8.1, 8.5_
  
  - [ ] 10.2 Implement patient authentication and access control
    - Generate secure access links for patients
    - Implement token-based authentication with 24-hour expiration
    - Verify patients can only access their own data
    - _Requirements: 8.4, 8.6, 9.4, 9.7_
  
  - [ ]* 10.3 Write property tests for patient management
    - **Property 46: Access link generation**
    - **Property 47: Patient profile update authorization**
    - **Property 50: Token expiration enforcement**
    - **Property 53: Authentication requirement enforcement**
    - _Requirements: 8.4, 8.6, 9.4, 9.7_
  
  - [ ] 10.4 Implement monitoring status management
    - Calculate monitoring completion based on 30 days post-op or clinician marking
    - Update monitoring_status automatically
    - _Requirements: 8.8_
  
  - [ ]* 10.5 Write property tests for monitoring status
    - **Property 49: Monitoring completion status**
    - _Requirements: 8.8_

- [ ] 11. Checkpoint - Verify backend core functionality
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Implement healing timeline and analytics
  - [ ] 12.1 Create timeline endpoints
    - Implement GET /api/assessments/{patient_id} with chronological sorting
    - Calculate trend direction (positive/negative/stable)
    - Calculate average healing rate (score change per week)
    - Generate chart data structure (dates array, scores array)
    - _Requirements: 6.1, 6.2, 6.4, 6.5_
  
  - [ ]* 12.2 Write property tests for timeline logic
    - **Property 30: Assessment chronological ordering**
    - **Property 31: Timeline chart data structure**
    - **Property 32: Assessment detail completeness**
    - **Property 33: Trend direction calculation**
    - **Property 34: Healing rate calculation**
    - **Property 35: Insufficient data messaging**
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [ ] 13. Implement hospital dashboard backend
  - [ ] 13.1 Create dashboard data endpoints
    - Implement GET /api/dashboard/patients with sorting and filtering
    - Implement patient list priority sorting (escalations first, then by score, then by days since assessment)
    - Implement filters: All Patients, Escalations Only, High Risk Patients, Overdue Assessments
    - Calculate summary statistics (total patients, active escalations, average healing score)
    - _Requirements: 7.1, 7.2, 7.4, 7.5_
  
  - [ ]* 13.2 Write property tests for dashboard logic
    - **Property 36: Dashboard patient list completeness**
    - **Property 37: Patient list priority sorting**
    - **Property 38: Patient profile completeness**
    - **Property 39: Dashboard filter correctness**
    - **Property 40: Dashboard statistics accuracy**
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  
  - [ ] 13.3 Implement clinical notes functionality
    - Add clinical notes field to assessments
    - Implement access control (clinicians only)
    - Ensure notes are not exposed through patient-facing endpoints
    - _Requirements: 7.7_
  
  - [ ]* 13.4 Write property tests for clinical notes access control
    - **Property 41: Clinical notes access control**
    - _Requirements: 7.7_
  
  - [ ] 13.5 Implement patient data export
    - Create PDF export function with patient profile, assessments, photos
    - Implement GET /api/dashboard/export/{patient_id} endpoint
    - _Requirements: 7.8_
  
  - [ ]* 13.6 Write property tests for data export
    - **Property 42: Patient data export completeness**
    - _Requirements: 7.8_

- [ ] 14. Implement security and audit logging
  - [ ] 14.1 Add audit logging for data access
    - Create audit_log table in DynamoDB
    - Log all photo views, assessment retrievals, dashboard access
    - Include timestamp, user_id, resource_id in logs
    - _Requirements: 9.5_
  
  - [ ]* 14.2 Write property tests for audit logging
    - **Property 51: Access event logging**
    - _Requirements: 9.5_
  
  - [ ] 14.3 Implement input sanitization
    - Add sanitization middleware for all user inputs
    - Escape special characters in patient names, clinical notes
    - Validate and sanitize file uploads
    - _Requirements: 9.8_
  
  - [ ]* 14.4 Write property tests for input sanitization
    - **Property 54: Input sanitization**
    - _Requirements: 9.8_
  
  - [ ] 14.5 Implement data retention policy
    - Create background job to delete photos and assessments after 90 days
    - Check for extended retention flag before deletion
    - _Requirements: 9.6_
  
  - [ ]* 14.6 Write property tests for data retention
    - **Property 52: Data retention enforcement**
    - _Requirements: 9.6_

- [ ] 15. Checkpoint - Verify backend security and compliance
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 16. Implement frontend patient interface
  - [ ] 16.1 Create patient home page
    - Display latest healing score with visual indicator
    - Show next upload date
    - Display recent assessments summary
    - Add navigation to photo upload and timeline
    - _Requirements: 6.1_
  
  - [ ] 16.2 Create photo upload page
    - Implement camera capture using MediaDevices API
    - Add file upload fallback
    - Show real-time validation feedback
    - Display upload progress
    - Prevent duplicate submissions
    - _Requirements: 1.1, 1.2, 1.5_
  
  - [ ]* 16.3 Write unit tests for photo upload component
    - Test validation feedback display
    - Test upload progress display
    - Test duplicate submission prevention
    - _Requirements: 1.2, 1.5_
  
  - [ ] 16.4 Create healing timeline page
    - Display assessments in chronological order
    - Show line chart of healing score progression
    - Highlight positive/negative trends with colors
    - Display average healing rate
    - Show encouragement message when < 2 assessments
    - _Requirements: 6.1, 6.2, 6.4, 6.5, 6.6_
  
  - [ ] 16.5 Create assessment detail view
    - Display wound photo with zoom capability
    - Show tissue analysis and PWAT scores
    - Display AI summary and recommendations
    - _Requirements: 6.3_
  
  - [ ] 16.6 Create side-by-side photo comparison view
    - Allow selection of two assessments
    - Display photos side-by-side
    - Show healing score change between dates
    - _Requirements: 6.7_

- [ ] 17. Implement frontend hospital dashboard
  - [ ] 17.1 Create dashboard patient list view
    - Display sortable/filterable patient table
    - Show latest healing score and assessment date for each patient
    - Highlight escalations with urgency indicators
    - Implement filter buttons (All, Escalations Only, High Risk, Overdue)
    - _Requirements: 7.1, 7.2, 7.4_
  
  - [ ] 17.2 Create dashboard summary statistics panel
    - Display total patients monitored
    - Show active escalations count
    - Calculate and display average healing score
    - _Requirements: 7.5_
  
  - [ ] 17.3 Create patient detail page for clinicians
    - Display complete patient profile with risk factors
    - Show healing timeline with all assessments
    - Display wound photos in gallery view
    - Show voice interaction history with transcripts
    - Add clinical notes input field
    - _Requirements: 7.3, 7.6, 7.7_
  
  - [ ] 17.4 Create escalation management interface
    - Display escalation queue sorted by urgency
    - Show complete patient context for each escalation
    - Add status update controls (Reviewed, Action Taken, Scheduled Follow-up)
    - Add clinical notes field
    - _Requirements: 5.6, 5.7_
  
  - [ ]* 17.5 Write unit tests for dashboard components
    - Test patient list sorting and filtering
    - Test statistics calculations
    - Test escalation status updates
    - _Requirements: 7.2, 7.4, 7.5, 5.7_

- [ ] 18. Implement frontend API service layer
  - [ ] 18.1 Create API client with axios
    - Implement authentication token management
    - Add request/response interceptors for error handling
    - Create functions for all backend endpoints
    - _Requirements: 9.4, 9.7_
  
  - [ ] 18.2 Implement frontend authentication
    - Handle secure access link authentication
    - Store and refresh authentication tokens
    - Redirect to login on token expiration
    - _Requirements: 8.4, 9.4_

- [ ] 19. Implement responsive mobile design
  - [ ] 19.1 Create mobile-first CSS and layout components
    - Design for 320px-428px width (smartphones)
    - Add responsive breakpoints for tablets and desktop
    - Implement bottom navigation for patient interface
    - Create Material-UI theme for dashboard
    - _Requirements: General UX_
  
  - [ ] 19.2 Optimize photo capture for mobile
    - Use appropriate camera constraints for mobile devices
    - Add photo preview before upload
    - Optimize image compression for mobile networks
    - _Requirements: 1.1_

- [ ] 20. Final integration and end-to-end testing
  - [ ] 20.1 Set up test environment
    - Create test DynamoDB tables
    - Create test S3 bucket
    - Configure test Bedrock and Connect resources
    - _Requirements: All_
  
  - [ ]* 20.2 Write end-to-end tests for critical user journeys
    - Test patient photo upload → assessment → voice call flow
    - Test clinician dashboard → escalation review → action taken flow
    - Test healing timeline visualization
    - _Requirements: All_
  
  - [ ] 20.3 Perform manual testing
    - Test with real wound photos
    - Verify voice agent calls work correctly
    - Test on multiple mobile devices
    - Verify dashboard functionality with multiple patients
    - _Requirements: All_

- [ ] 21. Final checkpoint - Complete system verification
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional property-based and unit tests that can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties with 100+ iterations
- Unit tests validate specific examples and edge cases
- Integration and E2E tests verify complete workflows
- The implementation follows a bottom-up approach: data models → services → API endpoints → frontend
