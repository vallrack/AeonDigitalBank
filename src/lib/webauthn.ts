// Utility functions to simulate WebAuthn registration and authentication

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function registerBiometrics(userId: string, email: string): Promise<string> {
  if (!window.PublicKeyCredential) {
    throw new Error('Biometrics not supported on this device/browser.');
  }

  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);

  const encoder = new TextEncoder();
  const publicKey: PublicKeyCredentialCreationOptions = {
    challenge,
    rp: {
      name: 'Aeon Digital Bank',
      id: window.location.hostname
    },
    user: {
      id: encoder.encode(userId),
      name: email,
      displayName: email
    },
    pubKeyCredParams: [
      { alg: -7, type: 'public-key' },
      { alg: -257, type: 'public-key' }
    ],
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      userVerification: 'required'
    },
    timeout: 60000,
    attestation: 'none'
  };

  const credential = await navigator.credentials.create({ publicKey }) as PublicKeyCredential;
  if (!credential) {
    throw new Error('Registration failed or was cancelled.');
  }

  return arrayBufferToBase64(credential.rawId);
}

export async function verifyBiometrics(credentialIdBase64: string): Promise<boolean> {
  if (!window.PublicKeyCredential) {
    throw new Error('Biometrics not supported on this device/browser.');
  }

  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);

  const rawId = base64ToArrayBuffer(credentialIdBase64);

  const publicKey: PublicKeyCredentialRequestOptions = {
    challenge,
    rpId: window.location.hostname,
    allowCredentials: [{
      type: 'public-key',
      id: rawId,
      transports: ['internal']
    }],
    userVerification: 'required',
    timeout: 60000
  };

  try {
    const assertion = await navigator.credentials.get({ publicKey });
    return !!assertion;
  } catch (error) {
    console.error(error);
    return false;
  }
}
