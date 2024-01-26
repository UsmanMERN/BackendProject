import { v2 as cloudinary } from 'cloudinary';
import fs from "fs"
import { ApiError } from './ApiError.js';

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
        fs.unlinkSync(localFilePath)
        return response
    } catch (error) {
        fs.unlink(localFilePath) // remove the locally uploaded file saved as locally 
        console.error(error);
        return null
    }
}

const deleteUploadedImageFromCloudinary = async (uploadedLink) => {
    try {
        if (!uploadedLink) {
            throw new ApiError(400, "Uploaded link not provided.");
        }

        const result = await cloudinary.uploader.destroy(uploadedLink, { resource_type: 'auto' });

        if (result.result !== 'ok') {
            throw new ApiError(400, `Error deleting image from Cloudinary: ${result.result}`);
        }

        console.log(result);
    } catch (error) {
        console.error(error.message);
    }
};

export { uploadOnCloudinary, deleteUploadedImageFromCloudinary }