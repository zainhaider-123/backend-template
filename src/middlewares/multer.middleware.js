import multer from "multer";
import path from "path"

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "./public/temp")
    },
    filename : function (req, file, cb) {
        //cb(null, file.originalname)

        //iwill convert everyfile to jpg later
        
        
        const ext = path.extname(file.originalname); // e.g. ".jpeg"
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, `${uniqueSuffix}${ext}`);
    }
})

export default multer({
    storage: storage,
})