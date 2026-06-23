import React from 'react'
import "../../../index.css"

const Hero = () => {
  return (
    <div  className='flex flex-col justify-center items-center mt-[7rem] mb-[5rem] w-[90%] mx-auto projects-hero'>
        <h1 className="text-5xl md:text-7xl font-bold leading-tight font-[azonix]">
          Services
        </h1>
        <p className=" text-gray-400 text-xl md:text-2xl dm-sans mt-6 text-justify mx-auto md:mx-0 ">
          We build websites that grow your brand and custom software that runs your business. Every project combines modern design, solid engineering, and a clear focus on outcomes — whether you need a high-converting site, an admin panel, or a full web application.
        </p>
    </div>
  )
}

export default Hero