import React from 'react'
import SectionHeader from '../../UI/SectionHeader'
import TrustCard from '../../UI/TrustCard'

const Trust = () => {
  return (
    <>
      <SectionHeader title={"Edge"} />

      <section className="mx-auto max-w-[1200px] px-6 py-20">
        <div className="mb-10 text-center">
          <p className="dm-sans mx-auto max-w-2xl text-lg text-gray-400 md:text-xl">
            Whether it&apos;s a marketing website or a custom business app, we build products your team can depend on.
          </p>
        </div>

        <div className="grid auto-rows-fr grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <TrustCard
            title="Performance First"
            description="Fast, reliable websites and applications optimized for real-world daily use."
            image="https://ik.imagekit.io/bluepeakstudio/BluePeak%20Studio/3.png"
          />

          <TrustCard
            title="On-Time Execution"
            description="Clear timelines and structured delivery — from landing pages to full software builds."
            image="https://ik.imagekit.io/bluepeakstudio/BluePeak%20Studio/2.png"
          />

          <TrustCard
            title="Modern Technology"
            description="React, Node.js, APIs, and secure databases — built to scale as your business grows."
            image="https://ik.imagekit.io/bluepeakstudio/BluePeak%20Studio/1.png"
          />

          <TrustCard
            title="Built for Your Business"
            description="Custom logic around your workflow — you own the product, not a one-size-fits-all SaaS tool."
            image="https://ik.imagekit.io/bluepeakstudio/BluePeak%20Studio/4.png"
          />
        </div>
      </section>
    </>
  )
}

export default Trust
