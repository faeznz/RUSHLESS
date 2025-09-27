import React from "react";
import useQueryParams from "../../hooks/useQueryParams";
import useExamAccess from "../../hooks/useExamAccess";
import ExamLayout from "../../components/exam/ExamLayout";
import ExamAccessDenied from "../../components/exam/ExamAccessDenied";
import LoadingSpinner from "../../components/shared/LoadingSpinner";

export default function ExaminationPage() {
  const { courseId, userId } = useQueryParams();
  const { isAllowed, isLoading, message } = useExamAccess(courseId, userId);

  if (isLoading) return <LoadingSpinner />;
  if (!isAllowed) return <ExamAccessDenied message={message} />;

  return <ExamLayout />;
}
