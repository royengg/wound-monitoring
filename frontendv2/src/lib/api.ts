import axios from "axios";
import {
  AssessmentResult,
  Patient,
  PatientCreate,
  PatientUpdate,
  VoiceCallResponse,
} from "./types";

const api = axios.create({
  baseURL: "/api",
  timeout: 30000,
});

export const healthCheck = async () => {
  const { data } = await api.get<{ status: string; service: string }>(
    "/health",
  );
  return data;
};

export const getPatients = async () => {
  const { data } = await api.get<Patient[]>("/patients");
  return data;
};

export const getPatient = async (id: string) => {
  const { data } = await api.get<Patient>(`/patients/${id}`);
  return data;
};

export const createPatient = async (patientData: PatientCreate) => {
  const { data } = await api.post<Patient>("/patients", patientData);
  return data;
};

export const updatePatient = async (id: string, patientData: PatientUpdate) => {
  const { data } = await api.put<Patient>(`/patients/${id}`, patientData);
  return data;
};

export const deletePatient = async (id: string) => {
  const { data } = await api.delete(`/patients/${id}`);
  return data;
};

export const uploadWoundPhoto = async (patientId: string, file: File) => {
  const formData = new FormData();
  formData.append("patient_id", patientId);
  formData.append("file", file);

  const { data } = await api.post<AssessmentResult>(
    "/assessments/upload",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );
  return data;
};

export const getAssessments = async (patientId: string) => {
  const { data } = await api.get<AssessmentResult[]>(
    `/assessments/${patientId}`,
  );
  return data;
};

export const getAssessment = async (id: string) => {
  const { data } = await api.get<AssessmentResult>(`/assessments/detail/${id}`);
  return data;
};

export const triggerVoiceCall = async (patientId: string) => {
  const { data } = await api.post<VoiceCallResponse>("/voice/call", {
    patient_id: patientId,
  });
  return data;
};

export default api;
