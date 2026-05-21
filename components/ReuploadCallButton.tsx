'use client'

import UploadCallModal from '@/components/UploadCallModal'

interface Props {
  callId: string
  managerId: string
  managerName: string
}

export default function ReuploadCallButton({ callId, managerId, managerName }: Props) {
  return (
    <UploadCallModal
      managerId={managerId}
      managerName={managerName}
      existingCallId={callId}
    />
  )
}
