# Requirements Document: AI-Powered Post-Discharge Wound Monitoring System

## Introduction

This document specifies the requirements for an AI-powered post-discharge wound monitoring system designed for high-risk post-surgical patients in India. The system enables patients to upload smartphone photos of their surgical wounds, receives automated AI-powered assessments using computer vision and large language models, and facilitates proactive follow-up through a conversational voice agent. The system aims to reduce hospital readmissions, enable early detection of wound complications, and provide continuous monitoring for patients who may have limited access to in-person clinical care.

## Glossary

- **Patient**: A post-surgical individual enrolled in the wound monitoring program
- **Wound_Photo**: A digital image of a surgical wound captured via smartphone camera
- **Wound_Assessment**: An AI-generated analysis of wound healing status including tissue classification, healing score, and recommendations
- **Healing_Score**: A numerical value (0-100) representing the overall wound healing progress
- **Tissue_Analysis**: Classification of wound tissue types (healthy, granulation, slough, necrotic, infection signs)
- **Voice_Agent**: An AI-powered conversational system using Amazon Connect, Lex, and Polly for patient interaction
- **Escalation**: The process of flagging a patient case for immediate clinician review
- **Clinician**: A healthcare professional (doctor, nurse, wound care specialist) who reviews escalated cases
- **Hospital_Dashboard**: A web interface for clinicians to monitor multiple patients and review assessments
- **YOLOv8_Model**: A computer vision model for detecting and segmenting wound regions in photos
- **Bedrock_Service**: Amazon Bedrock service using Claude for natural language assessment generation
- **High_Risk_Patient**: A patient with elevated complication risk factors (diabetes, elderly age 65+, obesity BMI 30+)
- **Healing_Timeline**: A chronological record of wound assessments showing healing progression over time
- **Photo_Quality_Check**: Validation of uploaded photos for adequate lighting, focus, and wound visibility

## Requirements

### Requirement 1: Patient Photo Upload and Validation

**User Story:** As a patient, I want to upload photos of my surgical wound from my smartphone, so that I can receive timely assessment of my healing progress without visiting the hospital.

#### Acceptance Criteria

1. WHEN a patient accesses the photo upload interface, THE System SHALL display camera capture and file upload options
2. WHEN a patient captures or selects a Wound_Photo, THE System SHALL validate the photo meets minimum quality standards (resolution ≥ 1024x768, file size ≤ 10MB, format: JPEG/PNG)
3. WHEN a Wound_Photo passes validation, THE System SHALL upload it to S3_Storage with patient-specific metadata (patient_id, timestamp, photo_id)
4. IF a Wound_Photo fails quality validation, THEN THE System SHALL display specific error messages indicating the quality issue (too dark, too blurry, file too large)
5. WHEN a photo upload is in progress, THE System SHALL display upload progress and prevent duplicate submissions
6. WHEN a photo upload completes successfully, THE System SHALL confirm upload and automatically initiate wound assessment

### Requirement 2: AI-Powered Wound Detection and Segmentation

**User Story:** As a clinician, I want the system to automatically detect and isolate the wound region in patient photos, so that assessments focus on the relevant tissue area and ignore background elements.

#### Acceptance Criteria

1. WHEN a Wound_Photo is uploaded, THE YOLOv8_Model SHALL process the image to detect wound boundaries
2. WHEN the YOLOv8_Model detects a wound region, THE System SHALL generate a segmentation mask isolating the wound area
3. IF the YOLOv8_Model detects multiple potential wound regions, THEN THE System SHALL select the largest contiguous region as the primary wound
4. IF the YOLOv8_Model fails to detect any wound region with confidence ≥ 0.6, THEN THE System SHALL flag the photo for manual review and notify the patient
5. WHEN wound detection succeeds, THE System SHALL extract the wound region coordinates (bounding box) and pass them to the assessment service
6. THE System SHALL store the segmentation mask alongside the original photo for clinician review

### Requirement 3: Tissue Classification and Healing Score Generation

**User Story:** As a patient, I want to receive an objective healing score and tissue analysis, so that I can understand whether my wound is healing properly.

#### Acceptance Criteria

1. WHEN a wound region is detected, THE Bedrock_Service SHALL analyze the tissue composition and classify tissue types (healthy, granulation, slough, necrotic, infection signs)
2. WHEN tissue analysis completes, THE System SHALL generate a Healing_Score (0-100) based on tissue composition, wound size, and healing indicators
3. THE System SHALL calculate the Healing_Score using weighted factors: healthy tissue percentage (40%), granulation tissue presence (30%), absence of infection signs (20%), wound size reduction (10%)
4. WHEN the Healing_Score is below 40, THE System SHALL classify the assessment as "Poor - Requires Attention"
5. WHEN the Healing_Score is between 40-70, THE System SHALL classify the assessment as "Fair - Monitor Closely"
6. WHEN the Healing_Score is above 70, THE System SHALL classify the assessment as "Good - Healing Well"
7. THE System SHALL generate a natural language summary of the assessment findings in simple terms understandable by non-medical patients
8. THE System SHALL store the complete Wound_Assessment in DynamoDB_Assessments_Table with timestamp, patient_id, healing_score, tissue_analysis, and AI-generated summary

### Requirement 4: Voice Agent Interaction and Patient Communication

**User Story:** As a patient, I want to receive a phone call from an AI voice agent that discusses my wound assessment in my preferred language, so that I can ask questions and receive guidance without reading complex medical reports.

#### Acceptance Criteria

1. WHEN a Wound_Assessment is completed, THE Voice_Agent SHALL initiate an outbound call to the patient's registered phone number within 30 minutes
2. WHEN the patient answers the call, THE Voice_Agent SHALL greet the patient by name and explain the purpose of the call
3. THE Voice_Agent SHALL communicate the Healing_Score and assessment summary in conversational language using Amazon_Polly text-to-speech
4. WHEN the patient asks questions about their wound, THE Voice_Agent SHALL use Amazon_Lex to understand the intent and provide relevant responses based on the assessment data
5. THE Voice_Agent SHALL support Hindi and English language options based on patient preference stored in the patient profile
6. WHEN the Voice_Agent detects patient concern or confusion (through sentiment analysis), THE System SHALL offer to escalate to a human clinician
7. THE Voice_Agent SHALL ask the patient standardized follow-up questions: pain level (0-10 scale), discharge presence, odor, fever symptoms
8. THE System SHALL record the voice interaction transcript and patient responses in DynamoDB for clinician review
9. WHEN the call ends, THE Voice_Agent SHALL confirm the next scheduled photo upload date and remind the patient of warning signs to watch for

### Requirement 5: Escalation to Medical Professionals

**User Story:** As a clinician, I want the system to automatically escalate high-risk cases to me, so that I can intervene quickly when patients show signs of wound complications.

#### Acceptance Criteria

1. WHEN a Healing_Score is below 40, THE System SHALL automatically create an Escalation record and flag the patient for clinician review
2. WHEN tissue analysis detects infection signs (redness spreading, purulent discharge, necrotic tissue > 10%), THE System SHALL create an urgent Escalation regardless of Healing_Score
3. WHEN a patient reports fever > 38°C or severe pain > 7/10 during voice interaction, THE System SHALL create an urgent Escalation
4. WHEN an Escalation is created, THE System SHALL send real-time notifications to the assigned clinician via the Hospital_Dashboard
5. THE System SHALL prioritize Escalations by urgency level: Critical (infection signs + fever), High (Healing_Score < 30), Medium (Healing_Score 30-40)
6. WHEN a clinician views an Escalation, THE System SHALL display the complete patient history, all Wound_Photos, assessment timeline, and voice interaction transcripts
7. THE System SHALL allow clinicians to mark Escalations as "Reviewed", "Action Taken", or "Scheduled Follow-up" with notes
8. WHEN a clinician takes action on an Escalation, THE System SHALL update the patient record and notify the patient via SMS

### Requirement 6: Healing Timeline Tracking and Visualization

**User Story:** As a patient, I want to see a visual timeline of my wound healing progress over time, so that I can track improvement and stay motivated to follow care instructions.

#### Acceptance Criteria

1. WHEN a patient accesses the Healing_Timeline interface, THE System SHALL display all Wound_Assessments in chronological order with dates and Healing_Scores
2. THE System SHALL generate a line chart showing Healing_Score progression over time with date markers
3. WHEN a patient selects a specific assessment in the timeline, THE System SHALL display the corresponding Wound_Photo, tissue analysis, and AI summary
4. THE System SHALL highlight positive trends (score increasing) in green and negative trends (score decreasing) in red
5. THE System SHALL calculate and display the average healing rate (score change per week) for the patient
6. WHEN a patient has fewer than 2 assessments, THE System SHALL display a message encouraging regular photo uploads for trend analysis
7. THE System SHALL allow patients to compare side-by-side photos from different dates to visually observe healing changes

### Requirement 7: Hospital Dashboard for Clinician Monitoring

**User Story:** As a clinician, I want a centralized dashboard to monitor all my assigned patients, so that I can efficiently review cases and prioritize interventions.

#### Acceptance Criteria

1. WHEN a clinician logs into the Hospital_Dashboard, THE System SHALL display a list of all assigned patients with their latest Healing_Scores and assessment dates
2. THE System SHALL sort patients by priority: Escalations first, then by Healing_Score (lowest first), then by days since last assessment
3. WHEN a clinician selects a patient, THE System SHALL display the complete patient profile including risk factors (diabetes, age, BMI), surgery type, and surgery date
4. THE Hospital_Dashboard SHALL provide filtering options: All Patients, Escalations Only, High Risk Patients, Overdue Assessments (> 7 days since last photo)
5. THE System SHALL display summary statistics: total patients monitored, active Escalations, average Healing_Score across all patients, readmission rate
6. WHEN a clinician views a patient's detail page, THE System SHALL display the Healing_Timeline, all Wound_Photos in a gallery view, and voice interaction history
7. THE System SHALL allow clinicians to add clinical notes to any assessment that are visible to other clinicians but not to patients
8. THE System SHALL export patient data and assessment history in PDF format for medical record integration

### Requirement 8: Patient Registration and Profile Management

**User Story:** As a hospital administrator, I want to register post-surgical patients in the system with their medical details, so that the AI can provide personalized assessments based on risk factors.

#### Acceptance Criteria

1. WHEN a new patient is registered, THE System SHALL collect required information: patient_id, name, phone number, surgery type, surgery date, risk factors (diabetes, age, BMI)
2. THE System SHALL validate phone numbers are in valid Indian format (+91 followed by 10 digits)
3. THE System SHALL store patient profiles in DynamoDB_Patients_Table with unique patient_id as primary key
4. WHEN a patient profile is created, THE System SHALL generate a secure access link for the patient to access their personal monitoring interface
5. THE System SHALL allow patients to update their phone number and language preference (Hindi/English)
6. THE System SHALL prevent patients from viewing or modifying other patients' data
7. WHEN a patient's surgery date is entered, THE System SHALL calculate and display the post-operative day count on all assessments
8. THE System SHALL mark patients as "Completed Monitoring" after 30 days post-surgery or when clinician marks wound as fully healed

### Requirement 9: Data Security and Privacy Compliance

**User Story:** As a healthcare provider, I want patient data to be securely stored and transmitted, so that we comply with healthcare privacy regulations and protect sensitive medical information.

#### Acceptance Criteria

1. THE System SHALL encrypt all Wound_Photos at rest in S3_Storage using AES-256 encryption
2. THE System SHALL encrypt all data in transit using TLS 1.2 or higher for all API communications
3. THE System SHALL store patient data in DynamoDB with encryption at rest enabled
4. WHEN a patient accesses their data, THE System SHALL authenticate the request using secure tokens with expiration (24-hour validity)
5. THE System SHALL log all data access events (photo views, assessment retrievals, dashboard access) with timestamp and user identification
6. THE System SHALL automatically delete Wound_Photos and assessment data after 90 days unless clinician marks for extended retention
7. THE System SHALL prevent unauthorized API access by validating authentication tokens on all protected endpoints
8. THE System SHALL sanitize all user inputs to prevent injection attacks before processing or storage

### Requirement 10: System Performance and Reliability

**User Story:** As a patient, I want the system to process my wound photos quickly and reliably, so that I receive timely feedback without long waits or system failures.

#### Acceptance Criteria

1. WHEN a Wound_Photo is uploaded, THE System SHALL complete the full assessment pipeline (upload → detection → analysis → storage) within 60 seconds for 95% of requests
2. THE YOLOv8_Model SHALL process wound detection within 5 seconds for images up to 5MB
3. THE Bedrock_Service SHALL generate tissue analysis and healing score within 15 seconds
4. THE System SHALL handle concurrent photo uploads from up to 50 patients simultaneously without performance degradation
5. WHEN the Bedrock_Service is unavailable, THE System SHALL queue the assessment request and retry up to 3 times with exponential backoff
6. IF all retry attempts fail, THEN THE System SHALL notify the patient that assessment is delayed and will be completed within 4 hours
7. THE System SHALL maintain 99.5% uptime during business hours (8 AM - 8 PM IST) measured monthly
8. THE System SHALL store all photos and assessments with 99.9% durability using S3 standard storage class

### Requirement 11: Voice Agent Call Management

**User Story:** As a patient, I want the voice agent to respect my availability and call preferences, so that I receive calls at convenient times and can reschedule if needed.

#### Acceptance Criteria

1. WHEN a patient registers, THE System SHALL collect preferred call time windows (morning 9-12, afternoon 12-5, evening 5-8)
2. THE Voice_Agent SHALL schedule outbound calls within the patient's preferred time window
3. WHEN a patient misses a voice call, THE System SHALL retry the call once after 2 hours
4. IF both call attempts fail, THEN THE System SHALL send an SMS with assessment summary and request patient to call back or upload next photo
5. THE System SHALL allow patients to opt out of voice calls and receive SMS-only notifications
6. WHEN a patient requests to speak with a human during the voice call, THE Voice_Agent SHALL transfer the call to the on-call clinician or provide a callback number
7. THE System SHALL limit voice call duration to 10 minutes, with a warning at 8 minutes to conclude the conversation
8. THE System SHALL record call completion status (answered, missed, voicemail, opted-out) for each voice interaction attempt
