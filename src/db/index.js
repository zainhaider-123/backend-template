import mongoose from 'mongoose'

const database = "projectOne"

const connectDB = async () => {
    try{
        const connectionIstance = await mongoose.connect(`${process.env.MONGO_URI}/${database}`)
        console.log(`Connected to database host: ${connectionIstance.connection.host}`)
    }
    catch(error){
        console.log("Error: ", error)
        process.exit(1)
    }

}

export default connectDB