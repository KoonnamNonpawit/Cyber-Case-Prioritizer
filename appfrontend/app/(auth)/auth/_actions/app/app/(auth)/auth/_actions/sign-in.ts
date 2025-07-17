interface SignInData {
  email: string;
  password: string;
}

// mock user (สามารถใส่หลาย user ได้)
const mockUser = {
  email: "admin@example.com",
  password: "123456", // ในของจริงควร hash
};

export async function signInAction({ email, password }: SignInData) {
  // เปรียบเทียบกับ mockUser
  if (email === mockUser.email && password === mockUser.password) {
    return { ok: true };
  } else {
    return null;
  }
}
