import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { requireAdmin } from "@/lib/firebase/admin";

const f = createUploadthing();

export const ourFileRouter = {
  treatmentImageUploader: f({
    image: { maxFileSize: "4MB", maxFileCount: 1 },
  })
    .middleware(async ({ req }) => {
      const admin = await requireAdmin(req);
      if (!admin) throw new UploadThingError("You must be signed in as an authorized Village Wellness Spa staff member.");
      return { userId: admin.uid };
    })
    .onUploadComplete(async ({ file, metadata }) => {
      console.info("[Village Wellness Spa] treatment image uploaded", {
        userId: metadata.userId,
        name: file.name,
        size: file.size,
        urlAvailable: Boolean(file.ufsUrl || file.url),
      });
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
