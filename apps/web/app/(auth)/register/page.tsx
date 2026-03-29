import { register } from "@/app/(auth)/actions/auth-actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAvailableSectorOptions } from "@/lib/sectors";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

type RegisterPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function RegisterPage({
  searchParams,
}: RegisterPageProps) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const sectors = await getAvailableSectorOptions(supabase);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Create account</CardTitle>
        <CardDescription>
          Register with your business name, email, and password.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={register} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="companyName">Business name</Label>
            <Input id="companyName" name="companyName" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sector">Business sector</Label>
            <Select
              id="sector"
              name="sector"
              required
              items={sectors}
              defaultValue={null}
            >
              <SelectTrigger className="w-full" id="sector">
                <SelectValue placeholder="Select your sector" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {sectors.map((sector) => (
                    <SelectItem key={sector.value} value={sector.value}>
                      {sector.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required />
          </div>

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <FormSubmitButton
            className="w-full"
            idleText="Register"
            pendingText="Creating account..."
          />

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link className="text-primary underline" href="/login">
              Sign in
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
