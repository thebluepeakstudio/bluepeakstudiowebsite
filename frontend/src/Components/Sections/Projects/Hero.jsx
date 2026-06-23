import React from 'react'
import "../../../index.css"

const Hero = () => {
  return (
    <div  className='flex flex-col justify-center items-center mt-[7rem] mb-[5rem] w-[90%] mx-auto projects-hero'>
        <h1 className="text-5xl md:text-7xl font-bold leading-tight font-[azonix]">
          Projects
        </h1>
        <p className=" text-gray-400 text-xl md:text-2xl dm-sans mt-6 text-justify mx-auto md:mx-0 ">
          A selection of websites and web applications we&apos;ve built — from brand sites and e-commerce stores to booking platforms and business dashboards.
        </p>
    </div>
  )
}

export default Hero