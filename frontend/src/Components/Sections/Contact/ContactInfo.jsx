import React from 'react'
import { MdOutlineAttachEmail } from "react-icons/md";
import { RiContactsLine } from "react-icons/ri";

const ContactInfo = () => {
    return (
        <div className='mb-[5rem] lg:mb-0'>
            <h1 className='text-5xl md:text-7xl font-bold leading-tight font-[azonix] text-center lg:text-left'>Let's get in touch</h1>
            <h2 className="text-base mt-6 text-lg md:text-2xl dm-sans text-gray-400 mx-auto md:mx-0 text-justify">
              Whether you need a website, a custom app, or a business system — tell us your goals and we&apos;ll help you plan the right solution.
            </h2>
            <div className="space-y-4 mt-8 mx-auto">
                <div className='flex gap-4 items-center'>
                    <RiContactsLine className="shrink-0" size={50} />
                    <p className="text-lg md:text-2xl dm-sans text-gray-400">
                        +91 93781 73053
                    </p>
                </div>

                <div className='flex gap-4 items-center'>
                    <MdOutlineAttachEmail className="shrink-0" size={50} />
                    <p className="text-lg md:text-2xl dm-sans text-gray-400 break-all">
                        thebluepeakstudio@gmail.com
                    </p>
                </div>


            </div>
        </div>
    )
}

export default ContactInfo