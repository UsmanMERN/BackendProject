import { v2 as cloudinary } from 'cloudinary';
import fs from "fs"

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null

        const response = await cloudinary.uploader.upload(localFilePath,
            { resource_type: "auto", });
        console.log("file uploaded on Cloudinary", response.url);
        return response
    } catch (error) {
        // console.error(error);
        fs.unlink(localFilePath) // remove the locally uploaded file saved as locally 
        console.error(error);
        return null
    }
}

export { uploadOnCloudinary }