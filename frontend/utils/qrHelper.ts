export interface QRCodePayload {
  memberId: string;
  gymId: string;
}

export const encodeQRCodePayload = (memberId: string, gymId: string): string => {
  return JSON.stringify({ memberId, gymId });
};

export const decodeQRCodePayload = (qrString: string): QRCodePayload | null => {
  try {
    const parsed = JSON.parse(qrString);
    if (parsed && typeof parsed === "object" && "memberId" in parsed && "gymId" in parsed) {
      return {
        memberId: parsed.memberId,
        gymId: parsed.gymId
      };
    }
  } catch (err) {
    // String is not JSON, might be a raw ID
    if (qrString && qrString.trim().length > 0) {
      return {
        memberId: qrString.trim(),
        gymId: ""
      };
    }
  }
  return null;
};
