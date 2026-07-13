import Link from "next/link";
import { redirect } from "next/navigation";
import { Home, MapPin, Pencil, Plus, Star, Trash2 } from "lucide-react";
import {
  createShippingAddress,
  deleteShippingAddress,
  getShippingAddresses,
  setDefaultShippingAddress,
  updateShippingAddress,
  type ShippingAddressItem,
} from "@/actions/address.actions";
import { ConfirmSubmitButton } from "@/components/admin/ConfirmSubmitButton";
import { SubmitButton } from "@/components/shared/SubmitButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCurrentUser } from "@/lib/permissions";

export const dynamic = "force-dynamic";

interface ProfileAddressesPageProps {
  searchParams?: Promise<{
    error?: string;
    message?: string;
  }>;
}

function addressFromFormData(formData: FormData) {
  return {
    fullName: String(formData.get("fullName") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    province: String(formData.get("province") ?? ""),
    district: String(formData.get("district") ?? ""),
    ward: String(formData.get("ward") ?? ""),
    addressLine: String(formData.get("addressLine") ?? ""),
    note: String(formData.get("note") ?? ""),
    makeDefault: formData.get("makeDefault") === "on",
  };
}

async function createAddressAction(formData: FormData) {
  "use server";

  const result = await createShippingAddress(addressFromFormData(formData));

  if (!result.success) {
    redirect(`/profile/addresses?error=${encodeURIComponent(result.message)}`);
  }

  redirect(`/profile/addresses?message=${encodeURIComponent(result.message)}`);
}

async function updateAddressAction(formData: FormData) {
  "use server";

  const result = await updateShippingAddress(
    String(formData.get("addressId") ?? ""),
    addressFromFormData(formData),
  );

  if (!result.success) {
    redirect(`/profile/addresses?error=${encodeURIComponent(result.message)}`);
  }

  redirect(`/profile/addresses?message=${encodeURIComponent(result.message)}`);
}

async function deleteAddressAction(formData: FormData) {
  "use server";

  const result = await deleteShippingAddress(String(formData.get("addressId") ?? ""));

  if (!result.success) {
    redirect(`/profile/addresses?error=${encodeURIComponent(result.message)}`);
  }

  redirect(`/profile/addresses?message=${encodeURIComponent(result.message)}`);
}

async function setDefaultAddressAction(formData: FormData) {
  "use server";

  const result = await setDefaultShippingAddress(String(formData.get("addressId") ?? ""));

  if (!result.success) {
    redirect(`/profile/addresses?error=${encodeURIComponent(result.message)}`);
  }

  redirect(`/profile/addresses?message=${encodeURIComponent(result.message)}`);
}

function AddressFields({ address }: { address?: Partial<ShippingAddressItem> }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <label className="text-sm font-bold text-zinc-200" htmlFor={address?.id ? `fullName-${address.id}` : "fullName"}>
          Họ tên người nhận
        </label>
        <Input
          className="h-11 border-white/10 bg-white/[0.07] text-zinc-100 placeholder:text-zinc-500"
          defaultValue={address?.fullName ?? ""}
          id={address?.id ? `fullName-${address.id}` : "fullName"}
          maxLength={120}
          name="fullName"
          required
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-bold text-zinc-200" htmlFor={address?.id ? `phone-${address.id}` : "phone"}>
          Số điện thoại
        </label>
        <Input
          className="h-11 border-white/10 bg-white/[0.07] text-zinc-100 placeholder:text-zinc-500"
          defaultValue={address?.phone ?? ""}
          id={address?.id ? `phone-${address.id}` : "phone"}
          maxLength={30}
          name="phone"
          required
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-bold text-zinc-200" htmlFor={address?.id ? `province-${address.id}` : "province"}>
          Tỉnh/Thành
        </label>
        <Input
          className="h-11 border-white/10 bg-white/[0.07] text-zinc-100 placeholder:text-zinc-500"
          defaultValue={address?.province ?? ""}
          id={address?.id ? `province-${address.id}` : "province"}
          maxLength={100}
          name="province"
          required
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-bold text-zinc-200" htmlFor={address?.id ? `district-${address.id}` : "district"}>
          Quận/Huyện
        </label>
        <Input
          className="h-11 border-white/10 bg-white/[0.07] text-zinc-100 placeholder:text-zinc-500"
          defaultValue={address?.district ?? ""}
          id={address?.id ? `district-${address.id}` : "district"}
          maxLength={100}
          name="district"
          required
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-bold text-zinc-200" htmlFor={address?.id ? `ward-${address.id}` : "ward"}>
          Phường/Xã
        </label>
        <Input
          className="h-11 border-white/10 bg-white/[0.07] text-zinc-100 placeholder:text-zinc-500"
          defaultValue={address?.ward ?? ""}
          id={address?.id ? `ward-${address.id}` : "ward"}
          maxLength={100}
          name="ward"
          required
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-bold text-zinc-200" htmlFor={address?.id ? `addressLine-${address.id}` : "addressLine"}>
          Địa chỉ cụ thể
        </label>
        <Input
          className="h-11 border-white/10 bg-white/[0.07] text-zinc-100 placeholder:text-zinc-500"
          defaultValue={address?.addressLine ?? ""}
          id={address?.id ? `addressLine-${address.id}` : "addressLine"}
          maxLength={220}
          name="addressLine"
          required
        />
      </div>

      <div className="space-y-2 md:col-span-2">
        <label className="text-sm font-bold text-zinc-200" htmlFor={address?.id ? `note-${address.id}` : "note"}>
          Ghi chú
        </label>
        <Input
          className="h-11 border-white/10 bg-white/[0.07] text-zinc-100 placeholder:text-zinc-500"
          defaultValue={address?.note ?? ""}
          id={address?.id ? `note-${address.id}` : "note"}
          maxLength={220}
          name="note"
          placeholder="Ví dụ: gọi trước khi giao"
        />
      </div>
    </div>
  );
}

function formatAddress(address: ShippingAddressItem): string {
  return [address.addressLine, address.ward, address.district, address.province].join(", ");
}

export default async function ProfileAddressesPage({ searchParams }: ProfileAddressesPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser || currentUser.isLocked) {
    redirect("/login?callbackUrl=/profile/addresses");
  }

  const [params, addresses] = await Promise.all([searchParams, getShippingAddresses()]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(15,118,110,0.18),transparent_34%),linear-gradient(180deg,#020617_0%,#111827_52%,#18181b_100%)] px-4 py-8 text-zinc-100 sm:px-6 lg:px-8">
      <section className="mx-auto grid max-w-5xl gap-6">
        <header className="rounded-2xl border border-white/10 bg-slate-950/72 p-5 shadow-[0_24px_90px_rgba(0,0,0,0.34)] backdrop-blur-2xl sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-[#F2C14E]">
                <MapPin className="h-4 w-4" aria-hidden="true" />
                Địa chỉ giao hàng
              </p>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-white">Shipping Address</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
                Địa chỉ được lưu theo tài khoản hiện tại và dùng làm snapshot khi checkout.
              </p>
            </div>
            <Link
              className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.07] px-4 text-sm font-bold text-zinc-100 transition hover:bg-white/[0.12]"
              href="/profile"
            >
              Về hồ sơ
            </Link>
          </div>

          {params?.error ? (
            <div className="mt-5 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {params.error}
            </div>
          ) : null}

          {params?.message ? (
            <div className="mt-5 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
              {params.message}
            </div>
          ) : null}
        </header>

        <section className="rounded-2xl border border-white/10 bg-slate-950/72 p-5 shadow-[0_24px_90px_rgba(0,0,0,0.34)] backdrop-blur-2xl sm:p-8">
          <h2 className="inline-flex items-center gap-2 text-xl font-black text-white">
            <Plus className="h-5 w-5 text-[#F2C14E]" aria-hidden="true" />
            Thêm địa chỉ mới
          </h2>
          <form action={createAddressAction} className="mt-5 grid gap-5">
            <AddressFields />
            <label className="flex w-fit cursor-pointer items-center gap-2 text-sm font-bold text-zinc-200">
              <input className="h-4 w-4 accent-[#D6A84F]" name="makeDefault" type="checkbox" />
              Đặt làm mặc định
            </label>
            <div className="flex justify-end">
              <SubmitButton className="h-11 gap-2 bg-[#D6A84F] px-5 text-slate-950 hover:bg-[#F2C14E]" pendingLabel="Đang thêm...">
                <Plus className="h-4 w-4" aria-hidden="true" />
                Thêm địa chỉ
              </SubmitButton>
            </div>
          </form>
        </section>

        <section className="grid gap-4">
          {addresses.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/12 bg-white/[0.04] p-8 text-center text-sm text-zinc-400">
              <Home className="mx-auto h-10 w-10 text-[#F2C14E]" aria-hidden="true" />
              <p className="mt-3">Chưa có địa chỉ giao hàng.</p>
            </div>
          ) : null}

          {addresses.map((address) => (
            <article
              className="rounded-2xl border border-white/10 bg-slate-950/72 p-5 shadow-[0_18px_55px_rgba(0,0,0,0.24)] backdrop-blur-2xl"
              key={address.id}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-black text-white">{address.fullName}</h2>
                    {address.isDefault ? (
                      <span className="rounded-full bg-[#F2C14E] px-2.5 py-1 text-xs font-black text-slate-950">
                        Mặc định
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm font-semibold text-zinc-300">{address.phone}</p>
                  <p className="mt-1 text-sm leading-6 text-zinc-400">{formatAddress(address)}</p>
                  {address.note ? <p className="mt-1 text-xs text-zinc-500">{address.note}</p> : null}
                </div>

                <div className="flex flex-wrap gap-2">
                  {!address.isDefault ? (
                    <form action={setDefaultAddressAction}>
                      <input name="addressId" type="hidden" value={address.id} />
                      <Button className="gap-2 border-white/10 bg-white/[0.07] text-zinc-100 hover:bg-white/[0.12]" type="submit" variant="outline">
                        <Star className="h-4 w-4" aria-hidden="true" />
                        Đặt mặc định
                      </Button>
                    </form>
                  ) : null}

                  <form action={deleteAddressAction}>
                    <input name="addressId" type="hidden" value={address.id} />
                    <ConfirmSubmitButton
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-red-400/30 bg-red-500/10 px-4 text-sm font-bold text-red-200 transition hover:bg-red-500/20"
                      confirmMessage="Bạn chắc chắn muốn xóa địa chỉ này?"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                      Xóa
                    </ConfirmSubmitButton>
                  </form>
                </div>
              </div>

              <details className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] p-4">
                <summary className="inline-flex cursor-pointer list-none items-center gap-2 text-sm font-black text-[#F2C14E]">
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                  Sửa địa chỉ
                </summary>
                <form action={updateAddressAction} className="mt-5 grid gap-5">
                  <input name="addressId" type="hidden" value={address.id} />
                  <AddressFields address={address} />
                  <div className="flex justify-end">
                    <SubmitButton className="h-10 bg-[#D6A84F] px-4 text-slate-950 hover:bg-[#F2C14E]" pendingLabel="Đang lưu...">
                      Lưu địa chỉ
                    </SubmitButton>
                  </div>
                </form>
              </details>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}
