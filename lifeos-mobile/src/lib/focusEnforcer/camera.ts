import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";

/** Client soft cap before upload (characters of base64). Server enforces a harder cap. */
export const MAX_CLIENT_IMAGE_BASE64_CHARS = 1_200_000;

export type CapturedProofImage = {
  base64: string;
  mimeType: "image/jpeg";
  width: number;
  height: number;
};

/**
 * Live camera only — no library upload as verified proof.
 * Resizes/compresses on-device before returning base64.
 */
export async function captureLiveProofImage(): Promise<CapturedProofImage | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Camera permission is required for Focus Enforcer proof.");
  }

  const shot = await ImagePicker.launchCameraAsync({
    mediaTypes: ["images"],
    allowsEditing: false,
    quality: 0.7,
    exif: false,
    base64: false,
    cameraType: ImagePicker.CameraType.back,
  });

  if (shot.canceled || !shot.assets?.[0]?.uri) return null;

  const asset = shot.assets[0];
  const manipulated = await ImageManipulator.manipulateAsync(
    asset.uri,
    [{ resize: { width: 1280 } }],
    {
      compress: 0.55,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    },
  );

  const base64 = manipulated.base64;
  if (!base64 || base64.length > MAX_CLIENT_IMAGE_BASE64_CHARS) {
    throw new Error("PROOF_TOO_LARGE");
  }

  return {
    base64,
    mimeType: "image/jpeg",
    width: manipulated.width,
    height: manipulated.height,
  };
}
